import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="flex flex-col lg:min-h-[85svh] justify-between bg-ink px-4 py-10 text-bone md:px-8 md:py-12"
    >
      <div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p class="font-semibold">BLAK</p>
          <p class="mt-3 max-w-64 leading-relaxed text-ash">
            Streetwear de autor y remeras personalizadas para equipos.
          </p>
        </div>

        <div>
          <p class="font-semibold">Recorrer</p>
          <nav class="mt-3 flex flex-col items-start gap-2" aria-label="Navegación del pie">
            <a
              routerLink="/products"
              class="flex min-h-11 items-center text-ash hover:text-white"
              >Colección</a
            >
            <a
              routerLink="/equipos"
              class="flex min-h-11 items-center text-ash hover:text-white"
              >Para equipos</a
            >
            <a
              routerLink="/mayoristas"
              class="flex min-h-11 items-center text-ash hover:text-white"
              >Mayoristas</a
            >
            <a
              routerLink="/about"
              class="flex min-h-11 items-center text-ash hover:text-white"
              >El estudio</a
            >
            <a routerLink="/cart" class="flex min-h-11 items-center text-ash hover:text-white"
              >Carrito</a
            >
          </nav>
        </div>

        <div>
          <p class="font-semibold">Comprar</p>
          <p class="mt-3 leading-relaxed text-ash">Pago por transferencia</p>
          <p class="leading-relaxed text-ash">Entrega coordinada en Córdoba</p>
        </div>

        <div>
          <p class="font-semibold">Hablemos</p>
          <a
            [href]="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-3 inline-flex min-h-11 items-center text-ash underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-white hover:decoration-current"
          >
            Abrir WhatsApp ↗
          </a>
        </div>
      </div>

      <div class="pt-24">
        <img
          ngSrc="images/brand/blak-logo-white.svg"
          alt="BLAK"
          width="590"
          height="144"
          class="h-auto w-full max-w-[36rem]"
        />
        <p class="mt-8 text-sm text-ash">© {{ currentYear }} BLAK</p>
      </div>
    </footer>
  `,
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  whatsappUrl = getWhatsAppUrl('Hola! Me gustaría hacer una consulta.');
}
