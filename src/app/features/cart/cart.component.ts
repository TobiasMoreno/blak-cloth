import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  Injector,
  signal,
  viewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';
import { STORE_INFO } from '../../core/constants/store-info.constants';
import { CartItem } from '../../core/models/cart-item.model';
import { readStorage, writeStorage } from '../../core/storage/local-storage';
import { QuantityStepperComponent } from '../../shared/components/quantity-stepper/quantity-stepper.component';
import { ToastService } from '../../shared/components/toast/toast.service';

type DeliveryType = 'retiro' | 'envio';

const DELIVERY_TYPE_STORAGE_KEY = 'blak-delivery-type';
const DELIVERY_ADDRESS_STORAGE_KEY = 'blak-delivery-address';

/** Lo que se mandó a WhatsApp, para poder reabrirlo o recuperar el carrito. */
interface SentOrder {
  items: CartItem[];
  total: number;
  url: string;
}

export function buildOrderMessage(
  items: CartItem[],
  total: number,
  deliveryType: DeliveryType,
  address: string
): string {
  let message = 'Hola! Quiero comprar las siguientes remeras:\n\n';

  items.forEach((item, index) => {
    message += `${index + 1}. Modelo: ${item.productName}\n`;
    message += `   - Talle: ${item.size}\n`;
    message += `   - Color: ${item.color}\n`;
    message += `   - Cantidad: ${item.quantity}\n\n`;
  });

  message += `Total: $${total.toLocaleString('es-AR')}\n\n`;

  if (deliveryType === 'retiro') {
    message += 'Tipo de entrega: Retiro en local\n';
  } else {
    message += 'Tipo de entrega: Envío a domicilio\n';
    message += `Dirección: ${address.trim()}\n`;
  }

  return message;
}

@Component({
  selector: 'app-cart',
  imports: [RouterLink, NgOptimizedImage, CurrencyArsPipe, QuantityStepperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-[100svh] bg-bone px-4 py-14 md:px-8 md:py-20">
      @if (sentOrder(); as order) {
        <!-- Cierre de la compra: el pedido ya está en WhatsApp -->
        <section class="bg-ink px-5 py-16 text-bone md:px-10 md:py-20" aria-labelledby="sent-title">
          <h1
            id="sent-title"
            #sentTitle
            tabindex="-1"
            class="max-w-[11ch] text-6xl font-black uppercase leading-[0.88] md:text-8xl"
          >
            Tu pedido está en WhatsApp
          </h1>
          <p class="mt-8 max-w-lg text-lg leading-relaxed text-smoke">
            Mandá el mensaje que preparamos y te respondemos para coordinar el pago por transferencia y la entrega.
          </p>

          <ul class="mt-10 max-w-lg divide-y divide-graphite border-y border-graphite">
            @for (item of order.items; track $index) {
              <li class="flex justify-between gap-4 py-3">
                <span>
                  <span class="font-semibold">{{ item.productName }}</span>
                  <span class="text-ash"> · {{ item.size }} · {{ item.color }} · ×{{ item.quantity }}</span>
                </span>
                <span class="shrink-0 tabular-nums">{{ (item.price * item.quantity) | currencyArs }}</span>
              </li>
            }
          </ul>
          <p class="mt-4 flex max-w-lg justify-between text-xl font-semibold tabular-nums">
            <span>Total</span>
            <span>{{ order.total | currencyArs }}</span>
          </p>

          <div class="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <a
              [href]="order.url"
              target="_blank"
              rel="noopener"
              class="on-accent inline-flex min-h-14 items-center bg-accent px-6 font-semibold text-white transition-colors duration-200 hover:bg-accent-hover"
            >
              Reabrir WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
            </a>
            <a
              routerLink="/products"
              class="inline-flex min-h-12 items-center font-semibold underline decoration-2 underline-offset-4 hover:text-accent-bright"
            >
              Volver a la colección
            </a>
            <button
              type="button"
              (click)="restoreSentOrder()"
              class="inline-flex min-h-12 items-center font-semibold text-ash underline decoration-2 underline-offset-4 hover:text-bone"
            >
              No lo mandé, recuperar el carrito
            </button>
          </div>
        </section>
      } @else {
        <h1 class="max-w-[8ch] text-7xl font-black uppercase leading-[0.82]">Tu carrito</h1>

        @if (cartService.isEmpty()) {
          <div class="mt-16 bg-ink px-5 py-20 text-bone md:px-10">
            <h2 class="max-w-[9ch] text-6xl font-black uppercase leading-[0.88] md:text-8xl">Todavía no elegiste una obra</h2>
            <p class="mt-8 max-w-md text-lg leading-relaxed text-ash">Agregá remeras desde la colección para empezar a armar tu pedido.</p>
            <a routerLink="/products" class="on-accent mt-8 inline-flex min-h-12 items-center bg-accent px-6 font-semibold text-white hover:bg-accent-hover">
              Explorar la colección
            </a>
          </div>
        } @else {
          <div class="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-12">
            <!-- Lista de productos -->
            <div class="space-y-5 lg:col-span-8">
              @for (item of cartService.getCartItems()(); track item.productId + item.size + item.color; let first = $first, i = $index) {
                <article class="flex flex-col gap-5 bg-surface p-4 sm:flex-row sm:items-center">
                  <!-- La foto es un atajo para mouse/dedo; el link accesible es el nombre (evita links duplicados) -->
                  <a
                    [routerLink]="['/product', item.productId]"
                    tabindex="-1"
                    aria-hidden="true"
                    class="block shrink-0 transition-opacity duration-200 hover:opacity-80"
                  >
                    <img [ngSrc]="item.image"
                         alt=""
                         width="150"
                         height="150"
                         [priority]="first"
                         class="aspect-[4/3] w-full object-cover sm:w-40">
                  </a>

                  <div class="min-w-0 flex-1">
                    <h2 class="text-3xl font-black uppercase leading-none [overflow-wrap:anywhere]">
                      <a
                        [routerLink]="['/product', item.productId]"
                        class="underline decoration-transparent decoration-2 underline-offset-4 transition-colors duration-200 hover:text-accent-deep hover:decoration-current"
                      >
                        {{ item.productName }}
                      </a>
                    </h2>
                    <p class="mb-3 mt-3 text-sm text-muted">
                      Talle {{ item.size }} · {{ item.color }}
                    </p>
                    <p class="text-lg font-semibold tabular-nums">
                      {{ (item.price * item.quantity) | currencyArs }}
                    </p>
                  </div>

                  <div class="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <div>
                      <label [for]="'cart-quantity-' + i" class="sr-only">
                        Cantidad de {{ item.productName }}, talle {{ item.size }}
                      </label>
                      <app-quantity-stepper
                        [inputId]="'cart-quantity-' + i"
                        [value]="item.quantity"
                        [max]="maxQuantity"
                        [itemName]="item.productName"
                        (valueChange)="updateQuantity(item, $event)"
                      />
                    </div>
                    <button
                      type="button"
                      (click)="removeItem(item, i)"
                      [attr.aria-label]="'Eliminar ' + item.productName + ' talle ' + item.size"
                      class="min-h-11 text-sm font-semibold text-accent-deep underline decoration-2 underline-offset-4 hover:text-wine">
                      Eliminar
                    </button>
                  </div>
                </article>
              }
            </div>

            <!-- Resumen -->
            <div class="lg:col-span-4">
              <div class="sticky top-24 bg-ink p-6 text-bone md:p-8">
                <h2 class="mb-8 text-5xl font-black uppercase">Resumen</h2>

                <dl class="mb-6 space-y-3">
                  <div class="flex justify-between gap-4 text-ash">
                    <dt>Subtotal</dt>
                    <dd class="tabular-nums">{{ cartService.totalPrice() | currencyArs }}</dd>
                  </div>
                  <div class="flex justify-between gap-4 text-ash">
                    <dt>Envío</dt>
                    <dd class="text-right text-sm">{{ shippingLabel() }}</dd>
                  </div>
                  <div class="flex justify-between gap-4 bg-graphite p-4 text-xl font-semibold tabular-nums">
                    <dt>{{ deliveryType() === 'envio' ? 'Total sin envío' : 'Total' }}</dt>
                    <dd>{{ cartService.totalPrice() | currencyArs }}</dd>
                  </div>
                </dl>

                <!-- Tipo de entrega -->
                <fieldset class="mb-6">
                  <legend class="mb-4 text-lg font-semibold">Tipo de entrega</legend>
                  <div class="grid gap-2">
                    <label class="delivery-choice flex min-h-12 items-center gap-3 px-4 py-2">
                      <input
                        type="radio"
                        name="delivery-type"
                        value="retiro"
                        class="sr-only"
                        [checked]="deliveryType() === 'retiro'"
                        (change)="onDeliveryTypeChange('retiro')"
                      />
                      <span class="delivery-dot" aria-hidden="true"></span>
                      <span>
                        <span class="block font-semibold">Retiro en local</span>
                        <span class="delivery-hint block text-sm">{{ pickupLabel }}</span>
                      </span>
                    </label>
                    <label class="delivery-choice flex min-h-12 items-center gap-3 px-4 py-2">
                      <input
                        type="radio"
                        name="delivery-type"
                        value="envio"
                        class="sr-only"
                        [checked]="deliveryType() === 'envio'"
                        (change)="onDeliveryTypeChange('envio')"
                      />
                      <span class="delivery-dot" aria-hidden="true"></span>
                      <span>
                        <span class="block font-semibold">Envío a domicilio</span>
                        <span class="delivery-hint block text-sm">{{ shippingAreaLabel }}</span>
                      </span>
                    </label>
                  </div>
                </fieldset>

                <!-- Campo de dirección (solo si es envío) -->
                @if (deliveryType() === 'envio') {
                  <div class="mb-6">
                    <label for="delivery-address" class="mb-2 block text-sm font-semibold text-bone">
                      Dirección de envío <span class="font-normal text-ash">(obligatoria)</span>
                    </label>
                    <input
                      #addressField
                      type="text"
                      id="delivery-address"
                      autocomplete="street-address"
                      required
                      aria-required="true"
                      [attr.aria-invalid]="addressMissing() ? true : null"
                      aria-describedby="delivery-address-hint"
                      [attr.aria-errormessage]="addressMissing() ? 'delivery-address-error' : null"
                      [value]="deliveryAddress()"
                      (input)="onAddressChange($event)"
                      placeholder="Calle, número, barrio"
                      class="min-h-12 w-full border-2 bg-bone px-3 text-base text-ink placeholder:text-muted"
                      [class.border-accent-bright]="addressMissing()"
                      [class.border-bone]="!addressMissing()"
                    />
                    <p id="delivery-address-hint" class="mt-2 text-sm leading-relaxed text-ash">
                      Si no sabés la dirección exacta, poné el barrio y la coordinamos por WhatsApp.
                    </p>
                    @if (addressMissing()) {
                      <p id="delivery-address-error" role="alert" class="mt-2 bg-[#3a0d12] px-3 py-2 text-sm font-semibold text-[#ffc2c7]">
                        Escribí una dirección o un barrio para el envío.
                      </p>
                    }
                  </div>
                }

                <!-- Link real: los bloqueadores de ventanas no frenan un click en un enlace -->
                <a
                  [href]="whatsAppUrl()"
                  target="_blank"
                  rel="noopener"
                  (click)="checkout($event)"
                  class="on-accent flex min-h-14 w-full items-center justify-center bg-accent px-5 font-semibold text-white transition-colors duration-200 hover:bg-accent-hover"
                >
                  Finalizar por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span>
                </a>

                <p class="mt-4 text-center text-sm leading-relaxed text-ash">
                  Se abre WhatsApp con tu pedido escrito. Ahí confirmamos stock, envío y el pago por {{ paymentLabel }}.
                </p>

                <a routerLink="/products" class="mt-4 flex min-h-12 items-center justify-center font-semibold underline decoration-2 underline-offset-4 hover:text-accent-bright">
                  Seguir comprando
                </a>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .delivery-choice {
      cursor: pointer;
      background-color: var(--color-graphite);
      color: var(--color-bone);
      transition: background-color 150ms ease, color 150ms ease;
    }

    .delivery-choice:hover {
      background-color: #3d3d39;
    }

    .delivery-choice:has(:checked) {
      background-color: var(--color-bone);
      color: var(--color-ink);
    }

    .delivery-choice:has(:focus-visible) {
      outline: 3px solid var(--color-accent-bright);
      outline-offset: 3px;
    }

    .delivery-hint {
      color: var(--color-ash);
    }

    .delivery-choice:has(:checked) .delivery-hint {
      color: var(--color-muted);
    }

    .delivery-dot {
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      border: 2px solid currentColor;
    }

    .delivery-choice:has(:checked) .delivery-dot {
      background-color: var(--color-accent);
      border-color: var(--color-accent);
    }
  `
})
export class CartComponent {
  cartService = inject(CartService);
  private toastService = inject(ToastService);
  private injector = inject(Injector);

  private sentTitle = viewChild<ElementRef<HTMLElement>>('sentTitle');
  private addressField = viewChild<ElementRef<HTMLInputElement>>('addressField');

  readonly maxQuantity = this.cartService.getMaxQuantity();
  readonly paymentLabel = STORE_INFO.payment.toLowerCase();
  readonly pickupLabel = STORE_INFO.pickupLocation ?? `En ${STORE_INFO.city}, coordinamos por WhatsApp`;
  readonly shippingAreaLabel = STORE_INFO.shippingArea ?? `En ${STORE_INFO.city}, costo según la zona`;

  // Sin elección guardada se propone retiro: es lo que no necesita más datos
  deliveryType = signal<DeliveryType>(this.loadDeliveryType());
  deliveryAddress = signal<string>(readStorage(DELIVERY_ADDRESS_STORAGE_KEY, 'lm-studio-delivery-address') ?? '');
  attemptedCheckout = signal(false);
  sentOrder = signal<SentOrder | null>(null);

  addressMissing = computed(
    () => this.attemptedCheckout() && this.deliveryType() === 'envio' && !this.deliveryAddress().trim()
  );

  shippingLabel = computed(() => {
    if (this.deliveryType() === 'retiro') return 'Sin costo, retirás vos';
    return STORE_INFO.shippingCost ?? 'Se coordina por WhatsApp';
  });

  whatsAppUrl = computed(() =>
    getWhatsAppUrl(
      buildOrderMessage(
        this.cartService.getCartItems()(),
        this.cartService.totalPrice(),
        this.deliveryType(),
        this.deliveryAddress()
      )
    )
  );

  updateQuantity(item: CartItem, quantity: number): void {
    this.cartService.updateQuantity(item.productId, item.size, item.color, quantity);
  }

  removeItem(item: CartItem, index: number): void {
    this.cartService.removeItem(item.productId, item.size, item.color);
    this.toastService.show('Quitaste una remera', `${item.productName} · Talle ${item.size}`, {
      label: 'Deshacer',
      run: () => this.cartService.restoreItem(item, index)
    });
  }

  onDeliveryTypeChange(type: DeliveryType): void {
    this.deliveryType.set(type);
    writeStorage(DELIVERY_TYPE_STORAGE_KEY, type);
  }

  onAddressChange(event: Event): void {
    const address = (event.target as HTMLInputElement).value;
    this.deliveryAddress.set(address);
    writeStorage(DELIVERY_ADDRESS_STORAGE_KEY, address);
  }

  /** El link abre WhatsApp por sí solo; acá se valida antes y se cierra la compra después. */
  checkout(event: MouseEvent): void {
    this.attemptedCheckout.set(true);

    if (this.addressMissing()) {
      event.preventDefault();
      this.addressField()?.nativeElement.focus();
      return;
    }

    this.sentOrder.set({
      items: this.cartService.getCartItems()(),
      total: this.cartService.totalPrice(),
      url: this.whatsAppUrl()
    });
    this.cartService.clearCart();
    afterNextRender(() => this.sentTitle()?.nativeElement.focus(), { injector: this.injector });
  }

  restoreSentOrder(): void {
    const order = this.sentOrder();
    if (!order) return;
    order.items.forEach((item, index) => this.cartService.restoreItem(item, index));
    this.sentOrder.set(null);
    this.attemptedCheckout.set(false);
  }

  private loadDeliveryType(): DeliveryType {
    const stored = readStorage(DELIVERY_TYPE_STORAGE_KEY, 'lm-studio-delivery-type');
    return stored === 'envio' ? 'envio' : 'retiro';
  }
}
