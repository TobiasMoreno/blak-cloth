import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Toast, ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  imports: [RouterLink],
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
        <div
          class="toast-enter pointer-events-auto flex items-start gap-3 bg-ink p-4 text-bone shadow-[0_12px_32px_rgb(11_11_11/0.28)]"
          (mouseenter)="toastService.pause(toast.id)"
          (mouseleave)="toastService.resume(toast.id)"
          (focusin)="toastService.pause(toast.id)"
          (focusout)="toastService.resume(toast.id)"
        >
          <span class="mt-2 h-2.5 w-2.5 shrink-0 bg-accent" aria-hidden="true"></span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ toast.summary }}</p>
            @if (toast.detail) {
              <p class="mt-1 text-sm text-ash">{{ toast.detail }}</p>
            }
            @if (toast.action; as action) {
              @if (linkOf(toast); as link) {
                <a
                  [routerLink]="link"
                  (click)="toastService.dismiss(toast.id)"
                  class="mt-2 inline-flex min-h-11 items-center font-semibold text-bone underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-bright"
                >
                  {{ action.label }}
                </a>
              } @else {
                <button
                  type="button"
                  (click)="runAction(toast)"
                  class="mt-2 inline-flex min-h-11 items-center font-semibold text-bone underline decoration-accent decoration-2 underline-offset-4 hover:text-accent-bright"
                >
                  {{ action.label }}
                </button>
              }
            }
          </div>
          <button
            type="button"
            (click)="toastService.dismiss(toast.id)"
            aria-label="Cerrar aviso"
            class="-m-2 flex min-h-11 min-w-11 items-center justify-center text-ash hover:text-white"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    @media (prefers-reduced-motion: no-preference) {
      .toast-enter {
        animation: toast-in 200ms cubic-bezier(0.22, 1, 0.36, 1);
      }
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

  linkOf(toast: Toast): string | null {
    return toast.action && 'link' in toast.action ? toast.action.link : null;
  }

  runAction(toast: Toast): void {
    if (toast.action && 'run' in toast.action) toast.action.run();
    this.toastService.dismiss(toast.id);
  }
}
