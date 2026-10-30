import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VolumeDiscountService } from '../../core/services/volume-discount.service';
import { CartService } from '../../core/services/cart.service';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';
import { STORE_INFO } from '../../core/constants/store-info.constants';

@Component({
  selector: 'app-wholesale',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-bone">
      <header class="bg-ink px-4 py-14 text-bone md:px-8 md:py-24">
        <h1 class="max-w-[9ch] text-[clamp(4rem,15vw,10rem)] font-black uppercase leading-[0.82] tracking-[-0.03em]">
          Precios por cantidad
        </h1>
        <p class="mt-10 max-w-[38ch] text-lg leading-relaxed text-smoke md:text-xl">
          Para revendedores, tiendas o grupos que compran juntos. Cuantas más prendas lleves, menos pagás cada una.
        </p>
        <a
          routerLink="/products"
          class="on-accent mt-8 inline-flex min-h-14 items-center bg-accent px-6 font-semibold text-white transition-colors duration-200 hover:bg-accent-hover"
        >
          Armar el pedido
        </a>
      </header>

      <section class="px-4 py-20 md:px-8 md:py-28" aria-labelledby="tiers-title">
        <div class="grid gap-10 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <h2 id="tiers-title" class="max-w-[10ch] text-6xl font-black uppercase leading-[0.88] md:text-7xl">
              Cuánto ahorrás
            </h2>
            <p class="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted">
              El porcentaje se descuenta del precio de cada prenda, sea remera, chomba o buzo, y el carrito lo calcula solo.
            </p>
            @if (example(); as ex) {
              <p class="mt-4 max-w-[42ch] text-lg leading-relaxed">
                Por ejemplo: {{ ex.first }} remeras + {{ ex.second }} chombas = {{ ex.minQuantity }} prendas, y todo el pedido tiene
                {{ ex.discountPercent }}% off.
              </p>
            }
          </div>

          @if (rows().length > 0) {
            <table class="w-full border-collapse text-left lg:col-span-6 lg:col-start-7">
              <caption class="sr-only">Descuento según la cantidad de prendas del pedido</caption>
              <thead>
                <tr class="border-b-2 border-ink text-sm uppercase tracking-wide">
                  <th scope="col" class="py-3 pr-4 font-semibold">Prendas</th>
                  <th scope="col" class="py-3 font-semibold">Descuento en todo el pedido</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.minQuantity) {
                  <tr class="border-b border-rule">
                    <th scope="row" class="py-5 pr-4 text-2xl font-black tabular-nums">{{ row.range }}</th>
                    <td class="py-5 text-2xl font-semibold tabular-nums text-accent-deep">{{ row.discountPercent }}% off</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="text-lg lg:col-span-6 lg:col-start-7">
              Estamos actualizando los precios por cantidad.
              <a [href]="whatsAppUrl" target="_blank" rel="noopener" class="font-semibold underline decoration-2 underline-offset-4 hover:text-accent-deep">
                Consultanos por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
              </a>
            </p>
          }
        </div>
      </section>

      <section class="bg-surface px-4 py-20 md:px-8 md:py-28" aria-labelledby="how-title">
        <h2 id="how-title" class="max-w-[10ch] text-6xl font-black uppercase leading-[0.88] md:text-7xl">Cómo funciona</h2>
        <ol class="mt-12 grid gap-10 md:grid-cols-3">
          <li>
            <p class="text-sm font-semibold uppercase tracking-wide text-muted">Paso 1</p>
            <h3 class="mt-2 text-2xl font-black uppercase">Mezclá lo que quieras</h3>
            <p class="mt-3 max-w-[36ch] leading-relaxed text-muted">
              Cuentan todas las prendas del carrito: podés combinar tipos de prenda, modelos, talles y colores.
            </p>
          </li>
          <li>
            <p class="text-sm font-semibold uppercase tracking-wide text-muted">Paso 2</p>
            <h3 class="mt-2 text-2xl font-black uppercase">Mirá el descuento</h3>
            <p class="mt-3 max-w-[36ch] leading-relaxed text-muted">
              El carrito te muestra el descuento aplicado y cuántas te faltan para el siguiente.
            </p>
          </li>
          <li>
            <p class="text-sm font-semibold uppercase tracking-wide text-muted">Paso 3</p>
            <h3 class="mt-2 text-2xl font-black uppercase">Cerramos por WhatsApp</h3>
            <p class="mt-3 max-w-[36ch] leading-relaxed text-muted">
              Te llega el pedido con el total. Confirmamos stock y coordinamos el pago por {{ paymentLabel }} y la entrega.
            </p>
          </li>
        </ol>
      </section>

      <section class="bg-ink px-4 py-20 text-bone md:px-8 md:py-24" aria-labelledby="more-title">
        <h2 id="more-title" class="max-w-[14ch] text-5xl font-black uppercase leading-[0.9] md:text-6xl">
          ¿Más de {{ maxQuantity }} de un mismo modelo?
        </h2>
        <p class="mt-6 max-w-[44ch] text-lg leading-relaxed text-smoke">
          Para pedidos grandes o con diseño propio, escribinos y armamos un presupuesto.
        </p>
        <div class="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <a
            [href]="whatsAppUrl"
            target="_blank"
            rel="noopener"
            class="on-accent inline-flex min-h-14 items-center bg-accent px-6 font-semibold text-white transition-colors duration-200 hover:bg-accent-hover"
          >
            Escribir por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
          </a>
          <a
            routerLink="/equipos"
            class="inline-flex min-h-12 items-center font-semibold underline decoration-2 underline-offset-4 hover:text-accent-bright"
          >
            Remeras para equipos
          </a>
        </div>
      </section>
    </div>
  `
})
export class WholesaleComponent {
  private volumeDiscount = inject(VolumeDiscountService);

  readonly maxQuantity = inject(CartService).getMaxQuantity();
  readonly paymentLabel = STORE_INFO.payment.toLowerCase();
  readonly whatsAppUrl = getWhatsAppUrl('Hola! Quiero consultar precios para comprar por cantidad.');

  // Sin precios de ejemplo: cada tipo de prenda tiene el suyo y un único número confundiría
  readonly rows = computed(() => {
    const tiers = this.volumeDiscount.tiers();
    return tiers.map((tier, index) => {
      const next = tiers[index + 1];
      return {
        minQuantity: tier.minQuantity,
        discountPercent: tier.discountPercent,
        range: next ? `${tier.minQuantity}–${next.minQuantity - 1}` : `${tier.minQuantity}+`
      };
    });
  });

  /** Un pedido mezclado que justo alcanza el primer tramo, para mostrar que se suman tipos de prenda. */
  readonly example = computed(() => {
    const tier = this.volumeDiscount.firstTier();
    if (!tier || tier.minQuantity < 2) return null;
    const first = Math.ceil(tier.minQuantity / 2);
    return { ...tier, first, second: tier.minQuantity - first };
  });
}
