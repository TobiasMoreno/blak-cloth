import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';

@Component({
  selector: 'app-about',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-bone">
      <!-- En el teléfono la foto va debajo del texto: superpuesta, el párrafo quedaba sobre la pared clara -->
      <header class="relative flex flex-col overflow-hidden bg-ink px-4 pt-10 text-bone md:block md:min-h-[76svh] md:px-8 md:py-10">
        <h1 class="relative z-10 max-w-[8ch] text-[clamp(5rem,22vw,19rem)] font-black uppercase leading-[0.72] tracking-[-0.03em]">
          El estudio
        </h1>
        <p class="relative z-10 mt-10 max-w-sm text-xl leading-relaxed md:absolute md:bottom-8 md:left-8 md:mt-0">
          Un proyecto independiente de Córdoba que convierte gráfica, cultura urbana y obsesiones visuales en prendas.
        </p>
        <img
          ngSrc="products/blak-minimal-series-001/mockup.jpeg"
          alt="Remera verde Blak Minimal Series de BLAK"
          width="1920"
          height="1200"
          sizes="(min-width: 768px) 43vw, 100vw"
          priority
          class="-mx-4 mt-10 aspect-[16/10] w-[calc(100%+2rem)] max-w-none object-cover opacity-75 md:absolute md:bottom-0 md:right-0 md:mx-0 md:mt-0 md:aspect-auto md:h-[70%] md:w-[43%]"
        />
      </header>

      <section class="section-rise px-4 py-24 md:px-8 md:py-36" aria-labelledby="origin-title">
        <div class="grid gap-14 md:grid-cols-12">
          <h2 id="origin-title" class="max-w-[8ch] text-6xl font-black uppercase leading-[0.88] md:col-span-5 md:text-8xl">
            La prenda es el soporte
          </h2>
          <div class="md:col-span-6 md:col-start-7">
            <p class="text-2xl leading-snug md:text-4xl">
              BLAK nace de la pasión por el arte, la gráfica y la cultura urbana. Cada remera empieza con una imagen que merece salir del papel.
            </p>
            <p class="mt-10 max-w-[52ch] text-lg leading-relaxed text-muted">
              Trabajamos para personas que buscan algo distinto, auténtico y con identidad propia. No diseñamos una prenda para completar un catálogo: construimos una composición que se sostiene por sí misma y después la llevamos al algodón.
            </p>
          </div>
        </div>
      </section>

      <section class="grid bg-surface lg:grid-cols-2" aria-labelledby="process-title">
        <div class="min-h-[55svh] lg:min-h-[88svh]">
          <img
            ngSrc="products/medusa/mockup.jpeg"
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt="Diseño Medusa impreso sobre remera negra"
            width="1920"
            height="1200"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="flex flex-col justify-between p-5 md:p-10 lg:p-14">
          <div>
            <h2 id="process-title" class="max-w-[8ch] text-6xl font-black uppercase leading-[0.88] md:text-8xl">
              Cómo llega a vos
            </h2>
            <p class="mt-8 max-w-md text-lg leading-relaxed text-muted">
              La compra mantiene el trato directo con quien está detrás de la marca.
            </p>
          </div>

          <ol class="mt-16 space-y-9 text-xl">
            <li class="grid grid-cols-[minmax(0,1fr)_auto] gap-5 bg-bone p-5">
              <span><strong class="block">Elegís</strong> modelo, talle y color.</span>
              <span aria-hidden="true">↘</span>
            </li>
            <li class="grid grid-cols-[minmax(0,1fr)_auto] gap-5 bg-rule p-5">
              <span><strong class="block">Armás</strong> el carrito con todas las prendas.</span>
              <span aria-hidden="true">↘</span>
            </li>
            <li class="grid grid-cols-[minmax(0,1fr)_auto] gap-5 bg-ink p-5 text-bone">
              <span><strong class="block">Coordinamos</strong> pago y entrega por WhatsApp.</span>
              <span aria-hidden="true">↗</span>
            </li>
          </ol>
        </div>
      </section>

      <a
        [href]="whatsappUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="on-accent group relative block min-h-[50svh] overflow-hidden bg-accent px-4 py-8 text-white transition-colors duration-200 hover:bg-ink md:px-8"
      >
        <span class="block max-w-sm text-lg leading-relaxed">¿Querés saber algo antes de elegir?</span>
        <span aria-hidden="true" class="absolute right-4 top-6 text-5xl md:right-8">↗</span>
        <span class="absolute inset-x-4 bottom-0 font-display text-[clamp(4.5rem,21vw,23rem)] font-black uppercase leading-[0.72] tracking-[-0.04em] md:inset-x-8">
          Hablemos<span class="sr-only"> por WhatsApp (se abre en otra pestaña)</span>
        </span>
      </a>
    </div>
  `
})
export class AboutComponent {
  whatsappUrl = getWhatsAppUrl('Hola! Me gustaría conocer más sobre BLAK.');
}
