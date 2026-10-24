import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="flex flex-col lg:min-h-[85svh] justify-between bg-[#0b0b0b] px-4 py-10 text-[#f4f4f0] md:px-8 md:py-12"
    >
      <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p class="font-semibold">LM Studio</p>
          <p class="mt-3 max-w-64 leading-relaxed text-[#b8b8b2]">
            Colección de autor y remeras de algodón para equipos amateurs.
          </p>
        </div>

        <div>
          <p class="font-semibold">Recorrer</p>
          <nav class="mt-3 flex flex-col items-start gap-2" aria-label="Navegación del pie">
            <a
              routerLink="/products"
              class="flex min-h-11 items-center text-[#b8b8b2] hover:text-white"
              >Colección</a
            >
            <a
              routerLink="/equipos"
              class="flex min-h-11 items-center text-[#b8b8b2] hover:text-white"
              >Para equipos</a
            >
            <a
              routerLink="/about"
              class="flex min-h-11 items-center text-[#b8b8b2] hover:text-white"
              >El estudio</a
            >
            <a routerLink="/cart" class="flex min-h-11 items-center text-[#b8b8b2] hover:text-white"
              >Carrito</a
            >
          </nav>
        </div>

        <div>
          <p class="font-semibold">Comprar</p>
          <p class="mt-3 leading-relaxed text-[#b8b8b2]">Pago por transferencia</p>
          <p class="leading-relaxed text-[#b8b8b2]">Entrega coordinada en Córdoba</p>
        </div>

        <div>
          <p class="font-semibold">Hablemos</p>
          <a
            [href]="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 inline-flex min-h-11 items-center text-[#b8b8b2] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-white hover:decoration-current"
          >
            Abrir WhatsApp ↗
          </a>
        </div>
      </div>

      <div class="pt-24">
        <p
          class="font-display text-[clamp(5.8rem,19vw,20rem)] font-black uppercase leading-[0.72] tracking-[-0.04em]"
        >
          LM Studio
        </p>
        <p class="mt-8 text-sm text-[#b8b8b2]">© {{ currentYear }} LM Studio</p>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  whatsappUrl = getWhatsAppUrl('Hola! Me gustaría hacer una consulta.');
}
