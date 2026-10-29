import { Injectable, signal } from '@angular/core';

/** Acción opcional del aviso: un link interno ("Ver carrito") o una función ("Deshacer"). */
export type ToastAction =
  | { label: string; link: string }
  | { label: string; run: () => void };

export interface Toast {
  id: number;
  summary: string;
  detail?: string;
  action?: ToastAction;
}

const TOAST_LIFE_MS = 3500;
// Con una acción hace falta más tiempo para llegar a tocarla
const TOAST_WITH_ACTION_LIFE_MS = 7000;

/** Avisos breves ("Agregado al carrito"). Reemplaza al p-toast de PrimeNG para no cargarlo en todas las páginas. */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 0;
  private toasts = signal<Toast[]>([]);
  private timers = new Map<number, ReturnType<typeof setTimeout>>();
  readonly items = this.toasts.asReadonly();

  show(summary: string, detail?: string, action?: ToastAction): void {
    const toast: Toast = { id: this.nextId++, summary, detail, action };
    this.toasts.update(current => [...current, toast]);
    this.schedule(toast);
  }

  dismiss(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.toasts.update(current => current.filter(toast => toast.id !== id));
  }

  /** Mientras el mouse o el foco están sobre el aviso, no se cierra solo. */
  pause(id: number): void {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
  }

  resume(id: number): void {
    const toast = this.toasts().find(item => item.id === id);
    if (toast && !this.timers.has(id)) this.schedule(toast);
  }

  private schedule(toast: Toast): void {
    const life = toast.action ? TOAST_WITH_ACTION_LIFE_MS : TOAST_LIFE_MS;
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), life));
  }
}
