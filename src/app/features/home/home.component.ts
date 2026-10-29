import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';
import { ClothesRackComponent } from './clothes-rack.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgOptimizedImage, CurrencyArsPipe, ClothesRackComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-clip bg-[#f4f4f0]">
      <section
        class="flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#0b0b0b] text-[#f4f4f0]"
        aria-labelledby="home-title"
      >
        <h1 id="home-title" class="px-4 pt-5 md:px-8 md:pt-8">
          <span class="monument-enter-left block">
            <img
              ngSrc="images/brand/blak-logo-white.svg"
              alt="BLAK"
              width="590"
              height="144"
              priority
              class="h-auto w-[calc(100vw-2rem)] max-w-[52rem] md:w-[38vw]"
            />
          </span>
        </h1>

        <!-- El perchero ocupa el espacio libre del hero y queda centrado en él -->
        <app-clothes-rack class="flex flex-1 flex-col justify-center py-6 md:py-8" />

        <div
          class="flex flex-col gap-6 px-4 pb-6 md:flex-row md:items-end md:justify-between md:px-8 md:pb-8"
        >
          <div class="max-w-sm">
            <p class="text-lg leading-snug text-[#f4f4f0] md:text-xl">
              Streetwear de autor creado en Córdoba para vestir una idea propia.
            </p>
            <div class="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <a
                routerLink="/products"
                class="inline-flex min-h-12 items-center bg-[#d9182b] px-6 font-semibold text-white transition-colors duration-200 hover:bg-[#c91425]"
              >
                Ver colección
              </a>
              <a
                routerLink="/equipos"
                class="flex min-h-11 w-fit items-center whitespace-nowrap text-sm font-semibold text-[#f4f4f0] underline decoration-[#d9182b] decoration-2 underline-offset-4 transition-colors duration-200 hover:text-[#d9182b]"
              >
                Remeras para tu equipo →
              </a>
            </div>
          </div>

          <p class="hidden max-w-52 text-sm leading-relaxed text-[#b8b8b2] md:block md:text-right">
            {{ designCountLabel() }}. Algodón. Compra coordinada por WhatsApp.
          </p>
        </div>
      </section>

      <section class="section-rise px-4 py-24 md:px-8 md:py-36" aria-labelledby="drop-title">
        <div class="mb-12 grid gap-8 md:grid-cols-12 md:items-end">
          <h2
            id="drop-title"
            class="max-w-[8ch] text-6xl font-black uppercase leading-[0.88] md:col-span-7 md:text-8xl"
          >
            El drop actual
          </h2>
          <p class="max-w-md text-lg leading-relaxed text-[#555550] md:col-span-4 md:col-start-9">
            Elegí una estampa y mirala como fue pensada: grande, directa y sin decoración alrededor.
          </p>
        </div>

        @if (selectedProduct(); as selected) {
        <div class="grid min-h-[78svh] bg-[#e7e7e1] lg:grid-cols-2">
          <div class="relative min-h-[52svh] overflow-hidden bg-[#d5d5ce] lg:min-h-full">
            <img
              [ngSrc]="selected.images[0]"
              [alt]="selected.name + ', frente y espalda'"
              width="1920"
              height="1200"
              class="h-full w-full object-cover"
            />
          </div>

          <div class="flex flex-col justify-between p-5 md:p-8 lg:p-10">
            <div
              class="flex flex-wrap gap-x-6 gap-y-3"
              role="tablist"
              aria-label="Diseños destacados"
            >
              @for (product of featuredProducts(); track product.id; let index = $index) {
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="activeDesign() === index"
                  (click)="activeDesign.set(index)"
                  [class]="
                    activeDesign() === index
                      ? 'min-h-11 text-left font-semibold text-[#0b0b0b] underline decoration-[#d9182b] decoration-2 underline-offset-8'
                      : 'min-h-11 text-left font-semibold text-[#555550] transition-colors duration-200 hover:text-[#0b0b0b]'
                  "
                >
                  {{ product.name }}
                </button>
              }
            </div>

            <div class="my-16 max-w-lg lg:my-8">
              <h3 class="text-5xl font-black uppercase leading-[0.9] md:text-7xl">
                {{ selected.name }}
              </h3>
              <p class="mt-8 max-w-[38ch] text-lg leading-relaxed text-[#555550]">
                {{ selected.description }}
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <p
                class="flex min-h-16 items-center bg-[#d6d6cf] px-5 text-xl font-semibold tabular-nums"
              >
                {{ selected.price | currencyArs }}
              </p>
              <a
                [routerLink]="['/product', selected.id]"
                class="flex min-h-16 items-center justify-between bg-[#0b0b0b] px-5 font-semibold text-[#f4f4f0] transition-colors duration-200 hover:bg-[#d9182b]"
              >
                Ver esta remera
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
        } @else {
          <div class="min-h-[78svh] bg-[#e7e7e1]" role="status" aria-label="Cargando diseños destacados"></div>
        }
      </section>

      <section
        class="section-rise bg-[#d9182b] px-4 py-24 text-white md:px-8 md:py-36"
        aria-labelledby="wear-art-title"
      >
        <div class="grid gap-12 md:grid-cols-12 md:items-end">
          <div class="md:col-span-4">
            <img
              ngSrc="products/positive-energy/mockup.jpeg"
              alt="Remera Positive Energy con ilustración de mariposa"
              width="1920"
              height="1200"
              class="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div class="md:col-span-7 md:col-start-6">
            <h2
              id="wear-art-title"
              class="max-w-[9ch] text-6xl font-black uppercase leading-[0.88] md:text-8xl"
            >
              Arte para usar
            </h2>
            <p class="mt-8 max-w-[32ch] text-xl leading-relaxed md:text-2xl">
              Cada prenda nace como una composición gráfica. El algodón es el soporte; la calle
              termina la obra.
            </p>
          </div>
        </div>
      </section>

      <section
        class="grid min-h-[84svh] bg-[#f4f4f0] lg:grid-cols-12"
        aria-labelledby="teams-home-title"
      >
        <figure class="relative min-h-[56svh] overflow-hidden lg:col-span-7 lg:min-h-full">
          <img
            ngSrc="images/teams/team-hero.jpg"
            alt="Imagen conceptual de un equipo amateur con remeras negras de algodón personalizadas"
            fill
            sizes="(max-width: 1023px) 100vw, 58vw"
            class="object-cover object-[58%_center]"
          />
          <figcaption
            class="absolute bottom-0 right-0 bg-[#0b0b0b] px-4 py-3 text-sm text-[#d0d0ca]"
          >
            Referencia visual del servicio
          </figcaption>
        </figure>
        <div
          class="section-rise flex flex-col justify-center px-4 py-20 md:px-8 lg:col-span-5 lg:px-12"
        >
          <h2
            id="teams-home-title"
            class="max-w-[8ch] text-6xl font-black uppercase leading-[0.86] md:text-8xl"
          >
            Tu equipo. Su remera.
          </h2>
          <p class="mt-8 max-w-[34ch] text-xl leading-relaxed text-[#555550]">
            Diseñamos remeras comunes de algodón para equipos de fútbol amateur, clubes y planteles.
          </p>
          <a
            routerLink="/equipos"
            class="mt-8 inline-flex min-h-14 w-fit items-center bg-[#0b0b0b] px-6 font-semibold text-[#f4f4f0] transition-colors duration-200 hover:bg-[#d9182b]"
          >
            Diseñar para mi equipo
          </a>
        </div>
      </section>

      <section
        class="bg-[#0b0b0b] px-4 py-24 text-[#f4f4f0] md:px-8 md:py-36"
        aria-labelledby="buy-title"
      >
        <div class="grid gap-16 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <div class="lg:sticky lg:top-28">
              <h2
                id="buy-title"
                class="max-w-[8ch] text-6xl font-black uppercase leading-[0.88] md:text-8xl"
              >
                De la obra a vos
              </h2>
              <p class="mt-8 max-w-sm text-lg leading-relaxed text-[#b8b8b2]">
                Un proceso corto y humano. Sin checkout anónimo ni respuestas automáticas.
              </p>
            </div>
          </div>

          <div class="space-y-24 lg:col-span-6 lg:col-start-7">
            <article class="section-rise min-h-[70svh]">
              <img
                ngSrc="products/medusa/mockup.jpeg"
                alt="Remera negra Medusa de BLAK"
                width="1920"
                height="1200"
                class="aspect-[4/3] w-full object-cover"
              />
              <h3 class="mt-8 text-4xl font-black uppercase">Elegí la gráfica</h3>
              <p class="mt-4 max-w-[38ch] text-lg leading-relaxed text-[#b8b8b2]">
                Mirá la colección completa y encontrá la imagen que querés llevar puesta.
              </p>
            </article>

            <article class="section-rise min-h-[70svh]">
              <img
                ngSrc="products/blak-minimal-series-001/mockup.jpeg"
                alt="Remera verde Blak Minimal Series"
                width="1920"
                height="1200"
                class="aspect-[4/3] w-full object-cover"
              />
              <h3 class="mt-8 text-4xl font-black uppercase">Definí talle y color</h3>
              <p class="mt-4 max-w-[38ch] text-lg leading-relaxed text-[#b8b8b2]">
                Cada ficha muestra las variantes disponibles antes de agregar la prenda al carrito.
              </p>
            </article>

            <article class="section-rise min-h-[60svh]">
              <img
                ngSrc="products/take-control/mockup.jpeg"
                alt="Remera negra Take Control de BLAK"
                width="1200"
                height="800"
                class="aspect-[4/3] w-full object-cover"
              />
              <h3 class="mt-8 text-4xl font-black uppercase">Cerralo por WhatsApp</h3>
              <p class="mt-4 max-w-[38ch] text-lg leading-relaxed text-[#b8b8b2]">
                Recibimos tu pedido armado, confirmamos disponibilidad y coordinamos pago y entrega
                en Córdoba.
              </p>
            </article>
          </div>
        </div>
      </section>

      <a
        routerLink="/products"
        class="group relative block min-h-[52svh] overflow-hidden bg-[#d9182b] px-4 py-8 text-white transition-colors duration-200 hover:bg-[#0b0b0b] md:px-8"
        aria-label="Elegir una remera de la colección"
      >
        <p class="max-w-sm text-lg leading-relaxed">La próxima obra puede salir con vos.</p>
        <span aria-hidden="true" class="absolute right-4 top-6 text-5xl md:right-8">↗</span>
        <span
          class="absolute inset-x-4 bottom-0 font-display text-[clamp(8rem,27vw,28rem)] font-black uppercase leading-[0.72] tracking-[-0.04em] md:inset-x-8"
        >
          Elegí
        </span>
      </a>
    </div>
  `,
})
export class HomeComponent {
  private productService = inject(ProductService);

  activeDesign = signal(0);
  featuredProducts = this.productService.featuredProducts;
  selectedProduct = computed(() => this.featuredProducts()[this.activeDesign()]);

  // Se actualiza solo con el catálogo; mientras carga no muestra "0 diseños"
  designCountLabel = computed(() => {
    const count = this.productService.products().length;
    if (count === 0) return 'Diseños de autor';
    return `${count} ${count === 1 ? 'diseño' : 'diseños'}`;
  });
}
