import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  summary: string;
  detail?: string;
}

const TOAST_LIFE_MS = 3500;

/** Avisos breves ("Agregado al carrito"). Reemplaza al p-toast de PrimeNG para no cargarlo en todas las páginas. */
@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private nextId = 0;
  private toasts = signal<Toast[]>([]);
  readonly items = this.toasts.asReadonly();

  show(summary: string, detail?: string): void {
    const toast: Toast = { id: this.nextId++, summary, detail };
    this.toasts.update(current => [...current, toast]);
    setTimeout(() => this.dismiss(toast.id), TOAST_LIFE_MS);
  }

  dismiss(id: number): void {
    this.toasts.update(current => current.filter(toast => toast.id !== id));
  }
}
