import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

export interface GoogleDriveConfig {
  clientId: string;
  apiKey: string;
  appId: string;
}

export interface DriveUser {
  displayName: string;
  emailAddress: string;
  photoLink?: string;
}

export interface DriveFileMetadata {
  id: string;
  name: string;
  modifiedTime: string;
  version: string;
  webViewLink?: string;
  parents?: string[];
}

export interface LoadedDriveWorkspace {
  content: unknown;
  file: DriveFileMetadata;
}

export type DriveConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const WORKSPACE_PROPERTY_KEY = 'blakWorkspace';
const WORKSPACE_PROPERTY_VALUE = 'costs-v1';
const FOLDER_PROPERTY_KEY = 'blakFolder';
const FOLDER_PROPERTY_VALUE = 'management-v1';
const DRIVE_FIELDS = 'id,name,modifiedTime,version,webViewLink,parents';
const EMPTY_CONFIG: GoogleDriveConfig = { clientId: '', apiKey: '', appId: '' };

export class DriveConflictError extends Error {
  constructor() {
    super('El archivo cambió en Google Drive desde la última lectura.');
    this.name = 'DriveConflictError';
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleDriveService {
  private document = inject(DOCUMENT);
  private browserWindow = this.document.defaultView as GoogleApiWindow | null;
  private configResource = httpResource<GoogleDriveConfig>(() => 'config/google-drive.json', {
    defaultValue: EMPTY_CONFIG,
  });
  private accessToken: string | null = null;

  readonly connectionState = signal<DriveConnectionState>('disconnected');
  readonly user = signal<DriveUser | null>(null);
  readonly workspaceFile = signal<DriveFileMetadata | null>(null);
  readonly workspaceFolder = signal<DriveFileMetadata | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly configLoading = this.configResource.isLoading;
  readonly isConfigured = computed(() => {
    const config = this.configResource.value();
    return Boolean(config.clientId.trim() && config.apiKey.trim() && config.appId.trim());
  });

  async connect(): Promise<void> {
    const config = this.configResource.value();
    if (!this.isConfigured()) {
      throw new Error('Falta configurar Google Drive para este sitio.');
    }
    if (!this.browserWindow) {
      throw new Error('Google Drive solo está disponible en el navegador.');
    }

    this.connectionState.set('connecting');
    this.errorMessage.set(null);

    try {
      await Promise.all([
        this.loadScript('google-identity-services', 'https://accounts.google.com/gsi/client'),
        this.loadScript('google-api-client', 'https://apis.google.com/js/api.js'),
      ]);
      await this.loadPickerApi();
      this.accessToken = await this.requestAccessToken(config.clientId);
      this.user.set(await this.getAboutUser());
      this.workspaceFile.set(await this.findWorkspaceFile());
      this.workspaceFolder.set(await this.findWorkspaceFolder());
      this.connectionState.set('connected');
    } catch (error) {
      this.connectionState.set('error');
      this.errorMessage.set(toErrorMessage(error));
      throw error;
    }
  }

  disconnect(): void {
    const token = this.accessToken;
    const google = this.browserWindow?.google;
    if (token && google?.accounts.oauth2.revoke) {
      google.accounts.oauth2.revoke(token, () => undefined);
    }
    this.accessToken = null;
    this.user.set(null);
    this.workspaceFile.set(null);
    this.workspaceFolder.set(null);
    this.errorMessage.set(null);
    this.connectionState.set('disconnected');
  }

  async createWorkspace(initialContent: unknown): Promise<LoadedDriveWorkspace> {
    const folder = await this.createFileMetadata({
      name: 'BLAK',
      mimeType: 'application/vnd.google-apps.folder',
      appProperties: { [FOLDER_PROPERTY_KEY]: FOLDER_PROPERTY_VALUE },
    });
    const file = await this.createFileMetadata({
      name: 'blak-costos.json',
      mimeType: 'application/json',
      parents: [folder.id],
      appProperties: { [WORKSPACE_PROPERTY_KEY]: WORKSPACE_PROPERTY_VALUE },
    });
    await this.uploadJson(file.id, initialContent);

    const savedFile = await this.getFileMetadata(file.id);
    const savedFolder = await this.getFileMetadata(folder.id);
    this.workspaceFile.set(savedFile);
    this.workspaceFolder.set(savedFolder);
    return { content: initialContent, file: savedFile };
  }

  async chooseSharedWorkspace(): Promise<LoadedDriveWorkspace | null> {
    const fileId = await this.openPicker();
    if (!fileId) return null;

    const file = await this.getFileMetadata(fileId);
    const content = await this.downloadJson(fileId);
    this.workspaceFile.set(file);
    if (file.parents?.[0]) {
      try {
        this.workspaceFolder.set(await this.getFileMetadata(file.parents[0]));
      } catch {
        // drive.file puede dar acceso al archivo compartido sin exponer la carpeta contenedora.
        this.workspaceFolder.set(null);
      }
    }
    return { content, file };
  }

  async loadWorkspace(): Promise<LoadedDriveWorkspace> {
    const file = this.workspaceFile();
    if (!file) throw new Error('No hay un archivo de costos vinculado.');
    const latestFile = await this.getFileMetadata(file.id);
    const content = await this.downloadJson(file.id);
    this.workspaceFile.set(latestFile);
    return { content, file: latestFile };
  }

  async saveWorkspace(content: unknown, expectedVersion: string): Promise<DriveFileMetadata> {
    const file = this.workspaceFile();
    if (!file) throw new Error('No hay un archivo de costos vinculado.');

    const latestFile = await this.getFileMetadata(file.id);
    if (latestFile.version !== expectedVersion) {
      throw new DriveConflictError();
    }

    await this.uploadJson(file.id, content);
    const savedFile = await this.getFileMetadata(file.id);
    this.workspaceFile.set(savedFile);
    return savedFile;
  }

  private async requestAccessToken(clientId: string): Promise<string> {
    const google = this.browserWindow?.google;
    if (!google?.accounts.oauth2) throw new Error('No se pudo cargar el acceso de Google.');

    return new Promise<string>((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error || !response.access_token) {
            reject(new Error(response.error_description ?? 'Google no autorizó el acceso.'));
            return;
          }
          resolve(response.access_token);
        },
        error_callback: (error) => reject(new Error(error.message ?? error.type)),
      });
      client.requestAccessToken({ prompt: '' });
    });
  }

  private async getAboutUser(): Promise<DriveUser> {
    const response = await this.driveFetch(
      'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink)',
    );
    const body = (await response.json()) as { user?: DriveUser };
    if (!body.user) throw new Error('No se pudo identificar la cuenta de Google Drive.');
    return body.user;
  }

  private async findWorkspaceFile(): Promise<DriveFileMetadata | null> {
    const query = `trashed = false and appProperties has { key='${WORKSPACE_PROPERTY_KEY}' and value='${WORKSPACE_PROPERTY_VALUE}' }`;
    return this.findFirstFile(query);
  }

  private async findWorkspaceFolder(): Promise<DriveFileMetadata | null> {
    const query = `trashed = false and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='${FOLDER_PROPERTY_KEY}' and value='${FOLDER_PROPERTY_VALUE}' }`;
    return this.findFirstFile(query);
  }

  private async findFirstFile(query: string): Promise<DriveFileMetadata | null> {
    const params = new URLSearchParams({
      q: query,
      orderBy: 'modifiedTime desc',
      pageSize: '1',
      fields: `files(${DRIVE_FIELDS})`,
    });
    const response = await this.driveFetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    const body = (await response.json()) as { files?: DriveFileMetadata[] };
    return body.files?.[0] ?? null;
  }

  private async createFileMetadata(metadata: DriveCreateMetadata): Promise<DriveFileMetadata> {
    const response = await this.driveFetch(
      `https://www.googleapis.com/drive/v3/files?fields=${encodeURIComponent(DRIVE_FIELDS)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      },
    );
    return (await response.json()) as DriveFileMetadata;
  }

  private async getFileMetadata(fileId: string): Promise<DriveFileMetadata> {
    const response = await this.driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(DRIVE_FIELDS)}`,
    );
    return (await response.json()) as DriveFileMetadata;
  }

  private async downloadJson(fileId: string): Promise<unknown> {
    const response = await this.driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    );
    return response.json() as Promise<unknown>;
  }

  private async uploadJson(fileId: string, content: unknown): Promise<void> {
    await this.driveFetch(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content, null, 2),
      },
    );
  }

  private async driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) throw new Error('La sesión de Google Drive venció. Volvé a conectarla.');

    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${this.accessToken}`);
    const response = await fetch(url, { ...init, headers });
    if (!response.ok) {
      if (response.status === 401) this.connectionState.set('disconnected');
      const detail = await safeResponseText(response);
      throw new Error(`Google Drive respondió ${response.status}${detail ? `: ${detail}` : ''}.`);
    }
    return response;
  }

  private async openPicker(): Promise<string | null> {
    const google = this.browserWindow?.google;
    const token = this.accessToken;
    const config = this.configResource.value();
    const pickerApi = google?.picker;
    if (!pickerApi || !token) throw new Error('No se pudo abrir el selector de Google Drive.');

    return new Promise<string | null>((resolve) => {
      const view = new pickerApi.DocsView(pickerApi.ViewId.DOCS)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMimeTypes('application/json')
        .setQuery('blak-costos');
      const picker = new pickerApi.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(config.apiKey)
        .setAppId(config.appId)
        .setOrigin(this.browserWindow?.location.origin ?? '')
        .setTitle('Elegí el archivo blak-costos.json compartido con vos')
        .setCallback((response) => {
          if (response.action === 'picked') resolve(response.docs?.[0]?.id ?? null);
          if (response.action === 'cancel') resolve(null);
        })
        .build();
      picker.setVisible(true);
    });
  }

  private async loadPickerApi(): Promise<void> {
    const gapi = this.browserWindow?.gapi;
    if (!gapi) throw new Error('No se pudo cargar el selector de archivos de Google.');
    await new Promise<void>((resolve, reject) => {
      gapi.load('picker', {
        callback: resolve,
        onerror: () => reject(new Error('Falló Google Picker.')),
      });
    });
  }

  private async loadScript(id: string, source: string): Promise<void> {
    const existing = this.document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset['loaded'] === 'true') return;

    await new Promise<void>((resolve, reject) => {
      const script = existing ?? this.document.createElement('script');
      script.id = id;
      script.src = source;
      script.async = true;
      script.defer = true;
      script.addEventListener(
        'load',
        () => {
          script.dataset['loaded'] = 'true';
          resolve();
        },
        { once: true },
      );
      script.addEventListener('error', () => reject(new Error(`No se pudo cargar ${source}.`)), {
        once: true,
      });
      if (!existing) this.document.head.appendChild(script);
    });
  }
}

interface DriveCreateMetadata {
  name: string;
  mimeType: string;
  parents?: string[];
  appProperties: Record<string, string>;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}

interface GooglePickerDocument {
  id?: string;
}

interface GooglePickerResponse {
  action?: 'picked' | 'cancel' | string;
  docs?: GooglePickerDocument[];
}

interface GooglePickerView {
  setIncludeFolders(value: boolean): GooglePickerView;
  setSelectFolderEnabled(value: boolean): GooglePickerView;
  setMimeTypes(value: string): GooglePickerView;
  setQuery(value: string): GooglePickerView;
}

interface GooglePicker {
  setVisible(value: boolean): void;
}

interface GooglePickerBuilder {
  addView(view: GooglePickerView): GooglePickerBuilder;
  setOAuthToken(token: string): GooglePickerBuilder;
  setDeveloperKey(key: string): GooglePickerBuilder;
  setAppId(appId: string): GooglePickerBuilder;
  setOrigin(origin: string): GooglePickerBuilder;
  setTitle(title: string): GooglePickerBuilder;
  setCallback(callback: (response: GooglePickerResponse) => void): GooglePickerBuilder;
  build(): GooglePicker;
}

interface GoogleApiWindow extends Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenResponse) => void;
          error_callback: (error: { type: string; message?: string }) => void;
        }): GoogleTokenClient;
        revoke?(token: string, callback: () => void): void;
      };
    };
    picker?: {
      ViewId: { DOCS: string };
      DocsView: new (viewId: string) => GooglePickerView;
      PickerBuilder: new () => GooglePickerBuilder;
    };
  };
  gapi?: {
    load(apiName: string, options: { callback: () => void; onerror: () => void }): void;
  };
}

async function safeResponseText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 300);
  } catch {
    return '';
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado con Google Drive.';
}
