import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgOptimizedImage, CurrencyArsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="overflow-clip bg-[#f4f4f0]">
      <section
        class="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-[#0b0b0b] text-[#f4f4f0]"
        aria-labelledby="home-title"
      >
        <h1 id="home-title" class="pointer-events-none absolute inset-0 z-20 font-display font-black uppercase leading-[0.78]">
          <span class="monument-enter-left absolute left-4 top-4 text-[clamp(7rem,18vw,18rem)] md:left-8 md:top-4 xl:top-4">
            LM
          </span>
          <span class="monument-enter-right absolute bottom-3 right-4 text-[clamp(5.4rem,14vw,14rem)] md:bottom-0 md:right-8">
            Studio
          </span>
        </h1>

        <div class="picture-open absolute inset-x-4 top-[20%] h-[41%] overflow-hidden bg-[#252525] md:inset-y-0 md:left-auto md:right-0 md:top-0 md:h-[72%] md:w-[47%]">
          <img
            ngSrc="images/products/the-rose-system.jpeg"
            alt="Remeras The Rose System de LM Studio, frente y espalda"
            width="1920"
            height="1200"
            priority
            class="product-drift h-full w-full object-cover object-center"
          />
        </div>

        <div class="absolute left-4 top-[64%] z-30 max-w-[17rem] md:left-8 md:top-[40%] md:max-w-sm">
          <p class="text-lg leading-snug text-[#f4f4f0] md:text-xl">
            Remeras de autor con gráfica urbana, creadas en Córdoba para vestir una idea propia.
          </p>
          <a
            routerLink="/products"
            class="mt-6 inline-flex min-h-12 items-center bg-[#ed1c2f] px-6 font-semibold text-white transition-colors duration-200 hover:bg-[#c91425]"
          >
            Ver colección
          </a>
        </div>

        <p class="absolute bottom-6 left-4 z-30 hidden max-w-52 text-sm leading-relaxed text-[#b8b8b2] md:left-8 md:block">
          Siete diseños. Algodón. Compra coordinada por WhatsApp.
        </p>
      </section>

      <section class="section-rise px-4 py-24 md:px-8 md:py-36" aria-labelledby="drop-title">
        <div class="mb-12 grid gap-8 md:grid-cols-12 md:items-end">
          <h2 id="drop-title" class="max-w-[8ch] text-6xl font-black uppercase leading-[0.88] md:col-span-7 md:text-8xl">
            El drop actual
          </h2>
          <p class="max-w-md text-lg leading-relaxed text-[#555550] md:col-span-4 md:col-start-9">
            Elegí una estampa y mirala como fue pensada: grande, directa y sin decoración alrededor.
          </p>
        </div>

        <div class="grid min-h-[78svh] bg-[#e7e7e1] lg:grid-cols-2">
          <div class="relative min-h-[52svh] overflow-hidden bg-[#d5d5ce] lg:min-h-full">
            <img
              [ngSrc]="selectedProduct().images[0]"
              [alt]="selectedProduct().name + ', frente y espalda'"
              width="1920"
              height="1200"
              class="h-full w-full object-cover"
            />
          </div>

          <div class="flex flex-col justify-between p-5 md:p-8 lg:p-10">
            <div class="flex flex-wrap gap-x-6 gap-y-3" role="tablist" aria-label="Diseños destacados">
              @for (product of featuredProducts; track product.id; let index = $index) {
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="activeDesign() === index"
                  (click)="activeDesign.set(index)"
                  [class]="activeDesign() === index
                    ? 'min-h-11 text-left font-semibold text-[#ed1c2f]'
                    : 'min-h-11 text-left font-semibold text-[#555550] transition-colors duration-200 hover:text-[#0b0b0b]'"
                >
                  {{ product.name }}
                </button>
              }
            </div>

            <div class="my-16 max-w-lg lg:my-8">
              <h3 class="text-5xl font-black uppercase leading-[0.9] md:text-7xl">
                {{ selectedProduct().name }}
              </h3>
              <p class="mt-8 max-w-[38ch] text-lg leading-relaxed text-[#555550]">
                {{ selectedProduct().description }}
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <p class="flex min-h-16 items-center bg-[#d6d6cf] px-5 text-xl font-semibold tabular-nums">
                {{ selectedProduct().price | currencyArs }}
              </p>
              <a
                [routerLink]="['/product', selectedProduct().id]"
                class="flex min-h-16 items-center justify-between bg-[#0b0b0b] px-5 font-semibold text-[#f4f4f0] transition-colors duration-200 hover:bg-[#ed1c2f]"
              >
                Ver esta remera
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="section-rise bg-[#ed1c2f] px-4 py-24 text-white md:px-8 md:py-36" aria-labelledby="wear-art-title">
        <div class="grid gap-12 md:grid-cols-12 md:items-end">
          <div class="md:col-span-4">
            <img
              ngSrc="images/products/positive-energy.jpeg"
              alt="Remera Positive Energy con ilustración de mariposa"
              width="1920"
              height="1200"
              class="aspect-[4/3] w-full object-cover"
            />
          </div>
          <div class="md:col-span-7 md:col-start-6">
            <h2 id="wear-art-title" class="max-w-[9ch] text-6xl font-black uppercase leading-[0.88] md:text-8xl">
              Arte para usar
            </h2>
            <p class="mt-8 max-w-[32ch] text-xl leading-relaxed md:text-2xl">
              Cada prenda nace como una composición gráfica. El algodón es el soporte; la calle termina la obra.
            </p>
          </div>
        </div>
      </section>

      <section class="bg-[#0b0b0b] px-4 py-24 text-[#f4f4f0] md:px-8 md:py-36" aria-labelledby="buy-title">
        <div class="grid gap-16 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <div class="lg:sticky lg:top-28">
              <h2 id="buy-title" class="max-w-[8ch] text-6xl font-black uppercase leading-[0.88] md:text-8xl">
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
                ngSrc="images/products/medusa.jpeg"
                alt="Remera negra Medusa de LM Studio"
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
                ngSrc="images/products/blak-ms-01.jpeg"
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
                ngSrc="images/products/take-control.jpeg"
                alt="Remera negra Take Control de LM Studio"
                width="1200"
                height="800"
                class="aspect-[4/3] w-full object-cover"
              />
              <h3 class="mt-8 text-4xl font-black uppercase">Cerralo por WhatsApp</h3>
              <p class="mt-4 max-w-[38ch] text-lg leading-relaxed text-[#b8b8b2]">
                Recibimos tu pedido armado, confirmamos disponibilidad y coordinamos pago y entrega en Córdoba.
              </p>
            </article>
          </div>
        </div>
      </section>

      <a
        routerLink="/products"
        class="group relative block min-h-[52svh] overflow-hidden bg-[#ed1c2f] px-4 py-8 text-white transition-colors duration-200 hover:bg-[#0b0b0b] md:px-8"
        aria-label="Elegir una remera de la colección"
      >
        <p class="max-w-sm text-lg leading-relaxed">La próxima obra puede salir con vos.</p>
        <span aria-hidden="true" class="absolute right-4 top-6 text-5xl md:right-8">↗</span>
        <span class="absolute inset-x-4 bottom-0 font-display text-[clamp(8rem,27vw,28rem)] font-black uppercase leading-[0.72] tracking-[-0.04em] md:inset-x-8">
          Elegí
        </span>
      </a>
    </div>
  `
})
export class HomeComponent {
  private productService = inject(ProductService);

  activeDesign = signal(0);
  featuredProducts = this.productService
    .getAllProducts()
    .filter(product => ['003', '006', '007'].includes(product.id));
  selectedProduct = computed(() => this.featuredProducts[this.activeDesign()]);
}
