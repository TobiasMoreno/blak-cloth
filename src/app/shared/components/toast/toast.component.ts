import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- La región existe siempre para que los lectores de pantalla anuncien cada aviso nuevo.
         Arriba, bajo el encabezado: abajo tapaba los botones de compra del detalle -->
    <div
      role="status"
      aria-live="polite"
      class="pointer-events-none fixed right-4 top-20 z-[9000] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      @for (toast of toastService.items(); track toast.id) {
        <div class="toast-enter pointer-events-auto flex items-start gap-3 bg-[#0b0b0b] p-4 text-[#f4f4f0] shadow-lg">
          <i class="pi pi-check mt-1 text-[#4ade80]" aria-hidden="true"></i>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ toast.summary }}</p>
            @if (toast.detail) {
              <p class="mt-1 text-sm text-[#b8b8b2]">{{ toast.detail }}</p>
            }
          </div>
          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Cerrar aviso"
            class="-m-2 flex min-h-11 min-w-11 items-center justify-center text-[#b8b8b2] hover:text-white"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-enter {
      animation: toast-in 200ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(-0.75rem);
      }
    }
  `
})
export class ToastComponent {
  toastService = inject(ToastService);
}
