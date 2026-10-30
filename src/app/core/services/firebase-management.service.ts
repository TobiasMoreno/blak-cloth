import { Injectable, signal } from '@angular/core';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  setDoc,
} from 'firebase/firestore';
import { FIREBASE_OPTIONS } from '../firebase/firebase.config';

export interface ManagementUser {
  displayName: string;
  emailAddress: string;
  photoUrl?: string;
}

export interface LoadedFirestoreWorkspace {
  content: unknown;
}

export type FirebaseConnectionState =
  | 'initializing'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

const FIREBASE_APP_NAME = 'blak-management';
const WORKSPACE_COLLECTION = 'workspaces';
const WORKSPACE_ID = 'blak';

export class FirestoreConflictError extends Error {
  constructor() {
    super('Los datos cambiaron en Firebase desde la última lectura.');
    this.name = 'FirestoreConflictError';
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseManagementService {
  private readonly app = this.getOrCreateApp();
  private readonly auth: Auth = getAuth(this.app);
  private readonly firestore: Firestore = getFirestore(this.app);
  private readonly workspaceDocument = doc(
    this.firestore,
    WORKSPACE_COLLECTION,
    WORKSPACE_ID,
  );
  private readonly authReady = this.observeInitialAuthState();

  readonly connectionState = signal<FirebaseConnectionState>('initializing');
  readonly user = signal<ManagementUser | null>(null);
  readonly errorMessage = signal<string | null>(null);

  async waitForAuthState(): Promise<User | null> {
    return this.authReady;
  }

  async connect(): Promise<void> {
    this.connectionState.set('connecting');
    this.errorMessage.set(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(this.auth, provider);
      this.setUser(credential.user);
      this.connectionState.set('connected');
    } catch (error) {
      this.connectionState.set('error');
      this.errorMessage.set(toFirebaseErrorMessage(error));
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await signOut(this.auth);
    this.user.set(null);
    this.errorMessage.set(null);
    this.connectionState.set('disconnected');
  }

  async loadWorkspace(): Promise<LoadedFirestoreWorkspace | null> {
    this.assertAuthenticated();
    try {
      const snapshot = await getDoc(this.workspaceDocument);
      return snapshot.exists() ? { content: snapshot.data() } : null;
    } catch (error) {
      this.handleFirestoreError(error);
      throw error;
    }
  }

  async createWorkspace(initialContent: unknown): Promise<LoadedFirestoreWorkspace> {
    this.assertAuthenticated();
    try {
      await runTransaction(this.firestore, async (transaction) => {
        const snapshot = await transaction.get(this.workspaceDocument);
        if (snapshot.exists()) {
          throw new Error('Ya existe un espacio de gestión en Firebase.');
        }
        transaction.set(this.workspaceDocument, initialContent);
      });
      return { content: initialContent };
    } catch (error) {
      this.handleFirestoreError(error);
      throw error;
    }
  }

  async replaceWorkspace(content: unknown): Promise<LoadedFirestoreWorkspace> {
    this.assertAuthenticated();
    try {
      await setDoc(this.workspaceDocument, content);
      return { content };
    } catch (error) {
      this.handleFirestoreError(error);
      throw error;
    }
  }

  async saveWorkspace(content: unknown, expectedRevision: number): Promise<void> {
    this.assertAuthenticated();
    try {
      await runTransaction(this.firestore, async (transaction) => {
        const snapshot = await transaction.get(this.workspaceDocument);
        const currentRevision = snapshot.exists() ? snapshot.data()['revision'] : null;
        if (currentRevision !== expectedRevision) throw new FirestoreConflictError();
        transaction.set(this.workspaceDocument, content);
      });
    } catch (error) {
      if (!(error instanceof FirestoreConflictError)) this.handleFirestoreError(error);
      throw error;
    }
  }

  private observeInitialAuthState(): Promise<User | null> {
    return new Promise<User | null>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        this.auth,
        (user) => {
          unsubscribe();
          this.setUser(user);
          this.connectionState.set(user ? 'connected' : 'disconnected');
          resolve(user);
        },
        (error) => {
          unsubscribe();
          this.connectionState.set('error');
          this.errorMessage.set(toFirebaseErrorMessage(error));
          reject(error);
        },
      );
    });
  }

  private setUser(user: User | null): void {
    this.user.set(
      user?.email
        ? {
            displayName: user.displayName ?? user.email,
            emailAddress: user.email,
            ...(user.photoURL ? { photoUrl: user.photoURL } : {}),
          }
        : null,
    );
  }

  private assertAuthenticated(): void {
    if (!this.auth.currentUser) throw new Error('Iniciá sesión para acceder a la gestión.');
  }

  private handleFirestoreError(error: unknown): void {
    this.errorMessage.set(toFirebaseErrorMessage(error));
  }

  private getOrCreateApp(): FirebaseApp {
    return getApps().find((app) => app.name === FIREBASE_APP_NAME) ??
      initializeApp(FIREBASE_OPTIONS, FIREBASE_APP_NAME);
  }
}

function toFirebaseErrorMessage(error: unknown): string {
  const code = getErrorCode(error);
  if (code === 'auth/popup-closed-by-user') return 'Cerraste el acceso con Google antes de terminar.';
  if (code === 'auth/popup-blocked') return 'El navegador bloqueó la ventana de acceso con Google.';
  if (code === 'permission-denied' || code === 'firestore/permission-denied') {
    return 'Esta cuenta de Google no está autorizada para acceder a la gestión BLAK.';
  }
  if (code === 'unavailable' || code === 'firestore/unavailable') {
    return 'Firebase no está disponible en este momento. Revisá tu conexión e intentá de nuevo.';
  }
  return error instanceof Error ? error.message : 'Ocurrió un error al conectar con Firebase.';
}

function getErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return '';
  return typeof error.code === 'string' ? error.code : '';
}
