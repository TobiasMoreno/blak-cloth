import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const COPIED_FEEDBACK_MS = 2500;

@Component({
  selector: 'app-share-buttons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center gap-2">
      <span class="mr-1 text-sm font-semibold uppercase tracking-wide">Compartir</span>

      <a
        [href]="whatsappUrl()"
        target="_blank"
        rel="noopener"
        [attr.aria-label]="'Compartir ' + title() + ' por WhatsApp (se abre en otra pestaña)'"
        class="flex min-h-11 items-center gap-2 bg-surface px-4 font-semibold transition-colors duration-200 hover:bg-ink hover:text-bone"
      >
        <i class="pi pi-whatsapp" aria-hidden="true"></i>
        WhatsApp
      </a>

      <button
        type="button"
        (click)="copyLink()"
        class="flex min-h-11 items-center gap-2 bg-surface px-4 font-semibold transition-colors duration-200 hover:bg-ink hover:text-bone"
      >
        <i [class]="copied() ? 'pi pi-check' : 'pi pi-link'" aria-hidden="true"></i>
        {{ copied() ? '¡Link copiado!' : 'Copiar link' }}
      </button>

      @if (canNativeShare) {
        <button
          type="button"
          (click)="nativeShare()"
          aria-label="Más opciones para compartir"
          class="flex min-h-11 min-w-11 items-center justify-center bg-surface px-3 transition-colors duration-200 hover:bg-ink hover:text-bone"
        >
          <i class="pi pi-share-alt" aria-hidden="true"></i>
        </button>
      }

      <span class="sr-only" role="status">{{ copied() ? 'Link copiado al portapapeles' : '' }}</span>
    </div>
  `
})
export class ShareButtonsComponent {
  private document = inject(DOCUMENT);

  /** Ruta a compartir, p. ej. /product/medusa */
  path = input.required<string>();
  title = input.required<string>();
  text = input('');

  copied = signal(false);
  private copiedTimeout: ReturnType<typeof setTimeout> | undefined;

  readonly canNativeShare = typeof this.document.defaultView?.navigator.share === 'function';

  url = computed(() => (this.document.location?.origin ?? '') + this.path());

  whatsappUrl = computed(() => {
    const message = [this.text() || this.title(), this.url()].join('\n');
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.copiedTimeout));
  }

  async copyLink(): Promise<void> {
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(this.url());
    } catch {
      // Navegadores sin permiso de portapapeles: copiar con una selección temporal
      const field = this.document.createElement('textarea');
      field.value = this.url();
      field.setAttribute('readonly', '');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      this.document.body.appendChild(field);
      field.select();
      this.document.execCommand('copy');
      field.remove();
    }
    this.copied.set(true);
    clearTimeout(this.copiedTimeout);
    this.copiedTimeout = setTimeout(() => this.copied.set(false), COPIED_FEEDBACK_MS);
  }

  async nativeShare(): Promise<void> {
    try {
      await this.document.defaultView?.navigator.share({ title: this.title(), text: this.text(), url: this.url() });
    } catch {
      // El usuario cerró el menú de compartir: no hay nada que hacer
    }
  }
}
