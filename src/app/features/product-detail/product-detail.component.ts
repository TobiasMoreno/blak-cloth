import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
  computed,
  effect,
  linkedSignal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { map } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { VolumeDiscountService } from '../../core/services/volume-discount.service';
import { Product, ProductSize } from '../../core/models/product.model';
import { CartItem } from '../../core/models/cart-item.model';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';
import { getColorHex } from '../../core/constants/colors.constants';
import { LEGACY_PRODUCT_IDS } from '../../core/constants/legacy-products.constants';
import { STORE_INFO } from '../../core/constants/store-info.constants';
import { productSeoDescription, productSeoTitle } from '../../core/seo/product-seo';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { QuantityStepperComponent } from '../../shared/components/quantity-stepper/quantity-stepper.component';
import { ToastService } from '../../shared/components/toast/toast.service';
import { ShareButtonsComponent } from '../../shared/components/share-buttons/share-buttons.component';

const SIZE_ORDER: ProductSize[] = ['S', 'M', 'L', 'XL'];

@Component({
  selector: 'app-product-detail',
  imports: [
    RouterLink,
    NgOptimizedImage,
    CurrencyArsPipe,
    QuantityStepperComponent,
    ProductCardComponent,
    ShareButtonsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (product(); as productData) {
      <div class="min-h-[100svh] bg-bone px-4 py-10 md:px-8 md:py-16">
        <div>
          <!-- Breadcrumbs -->
          <nav aria-label="Breadcrumb" class="mb-10">
            <ol class="flex items-center gap-3 text-sm text-muted">
              <li><a routerLink="/" class="hover:text-accent">Inicio</a></li>
              <li aria-hidden="true">→</li>
              <li><a routerLink="/products" class="hover:text-accent">Colección</a></li>
              <li aria-hidden="true">→</li>
              <li class="truncate font-semibold text-ink" aria-current="page">{{ productData.name }}</li>
            </ol>
          </nav>

          <div class="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            <!-- Imágenes -->
            <div class="flex flex-col-reverse gap-3 md:flex-row lg:col-span-7">
              @if (productData.images.length > 1) {
                <div class="flex gap-2 md:w-20 md:shrink-0 md:flex-col" role="group" aria-label="Fotos de la remera">
                  @for (img of productData.images; track img; let i = $index) {
                    <button
                      type="button"
                      [attr.aria-pressed]="activeImage() === i"
                      [attr.aria-label]="'Ver foto ' + (i + 1) + ' de ' + productData.images.length"
                      (click)="activeImage.set(i)"
                      [class]="activeImage() === i
                        ? 'aspect-square w-16 overflow-hidden bg-surface ring-4 ring-ink md:w-full'
                        : 'aspect-square w-16 overflow-hidden bg-surface opacity-60 hover:opacity-100 md:w-full'">
                      <img [ngSrc]="img" alt="" width="200" height="200" class="h-full w-full object-cover">
                    </button>
                  }
                </div>
              }
              <div class="flex-1">
                <div class="aspect-[4/3] overflow-hidden bg-surface lg:sticky lg:top-24">
                  <img [ngSrc]="productData.images[activeImage()] || productData.images[0]"
                       [alt]="'Remera ' + productData.name"
                       width="1200"
                       height="900"
                       sizes="(min-width: 1024px) 58vw, 100vw"
                       [style.view-transition-name]="'product-' + productData.id"
                       class="h-full w-full object-cover"
                       priority>
                </div>
              </div>
            </div>

            <!-- Información del producto -->
            <div class="lg:col-span-4 lg:col-start-9 lg:pt-6">
              <h1 class="max-w-[11ch] text-6xl font-black uppercase leading-[0.86] md:text-8xl">
                {{ productData.name }}
              </h1>

              <div class="mt-8 flex items-center justify-between gap-4">
                <div>
                  <p class="text-2xl font-semibold tabular-nums">
                    {{ productData.price | currencyArs }}
                  </p>
                  @if (firstTier(); as tier) {
                    <a
                      routerLink="/mayoristas"
                      class="mt-1 inline-flex min-h-11 items-center text-sm font-semibold underline decoration-2 underline-offset-4 hover:text-accent-deep"
                    >
                      {{ volumeDiscount.fromPrice(productData.price) | currencyArs }} c/u llevando {{ tier.minQuantity }}+
                    </a>
                  }
                </div>
                <button
                  type="button"
                  (click)="toggleFavorite()"
                  [attr.aria-pressed]="isFavorite()"
                  class="flex min-h-11 items-center gap-2 bg-surface px-4 font-semibold transition-colors duration-200 hover:bg-rule"
                >
                  <i [class]="isFavorite() ? 'pi pi-heart-fill text-accent' : 'pi pi-heart'" aria-hidden="true"></i>
                  {{ isFavorite() ? 'En favoritos' : 'Guardar' }}
                </button>
              </div>

              @if (productData.description) {
                <p class="mt-8 max-w-[40ch] text-lg leading-relaxed text-muted">
                  {{ productData.description }}
                </p>
              }

              @if (isSoldOut()) {
                <div class="mt-10 bg-surface p-5">
                  <p class="font-semibold">Por ahora no hay talles disponibles.</p>
                  <a
                    [href]="soldOutWhatsAppUrl()"
                    target="_blank"
                    rel="noopener"
                    class="mt-4 flex min-h-14 items-center justify-center bg-ink px-5 font-semibold text-bone transition-colors duration-200 hover:bg-accent"
                  >
                    Consultar por WhatsApp
                  </a>
                </div>
              } @else {
                <div class="mt-10 space-y-6">
                  <!-- Color: si hay uno solo se muestra como dato, no como elección -->
                  @if (productData.colors.length === 1) {
                    <p class="flex items-center gap-2 text-sm">
                      <span class="font-semibold uppercase tracking-wide">Color</span>
                      <span
                        class="inline-block h-4 w-4 rounded-full border border-field"
                        [style.background-color]="getColorHex(productData.colors[0])"
                        aria-hidden="true"
                      ></span>
                      {{ productData.colors[0] }}
                    </p>
                  } @else {
                    <fieldset>
                      <legend class="mb-3 text-sm font-semibold uppercase tracking-wide">
                        Color
                        @if (selectedColor()) {
                          <span class="font-normal normal-case tracking-normal text-muted"> · {{ selectedColor() }}</span>
                        }
                      </legend>
                      <div class="flex flex-wrap gap-2 [--choice-bg:var(--color-surface)]">
                        @for (color of productData.colors; track color) {
                          <label class="choice flex min-h-12 items-center gap-2 px-4 font-semibold">
                            <input
                              type="radio"
                              name="product-color"
                              class="sr-only"
                              [value]="color"
                              [checked]="selectedColor() === color"
                              (change)="selectedColor.set(color)"
                            />
                            <span
                              class="inline-block h-5 w-5 rounded-full border border-field"
                              [style.background-color]="getColorHex(color)"
                              aria-hidden="true"
                            ></span>
                            {{ color }}
                          </label>
                        }
                      </div>
                    </fieldset>
                  }

                  <fieldset>
                    <legend class="mb-3 text-sm font-semibold uppercase tracking-wide">Talle</legend>
                    <div class="flex flex-wrap gap-2 [--choice-bg:var(--color-surface)]">
                      @for (option of sizeOptions(); track option.size) {
                        <label class="choice flex min-h-12 min-w-12 items-center justify-center px-4 font-semibold">
                          <input
                            type="radio"
                            name="product-size"
                            class="sr-only"
                            [value]="option.size"
                            [checked]="selectedSize() === option.size"
                            [disabled]="!option.available"
                            (change)="selectedSize.set(option.size)"
                          />
                          {{ option.size }}
                          @if (!option.available) {
                            <span class="sr-only">, sin stock</span>
                          }
                        </label>
                      }
                    </div>

                    <details class="group mt-4">
                      <summary class="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold underline decoration-2 underline-offset-4 hover:text-accent-deep [&::-webkit-details-marker]:hidden">
                        Guía de talles
                        <span class="transition-transform duration-200 group-open:rotate-45" aria-hidden="true">+</span>
                      </summary>
                      @if (sizeChart.length > 0) {
                        <table class="mt-3 w-full max-w-sm text-left text-sm tabular-nums">
                          <caption class="sr-only">Medidas de la remera en centímetros</caption>
                          <thead class="border-b-2 border-ink">
                            <tr>
                              <th scope="col" class="py-2 font-semibold">Talle</th>
                              <th scope="col" class="py-2 font-semibold">Ancho de pecho</th>
                              <th scope="col" class="py-2 font-semibold">Largo</th>
                            </tr>
                          </thead>
                          <tbody>
                            @for (row of sizeChart; track row.size) {
                              <tr class="border-b border-rule">
                                <th scope="row" class="py-2 font-semibold">{{ row.size }}</th>
                                <td class="py-2">{{ row.chest }} cm</td>
                                <td class="py-2">{{ row.length }} cm</td>
                              </tr>
                            }
                          </tbody>
                        </table>
                        <p class="mt-2 text-sm text-muted">Medí una remera que te quede bien, apoyada y estirada.</p>
                      } @else {
                        <p class="mt-3 max-w-[40ch] text-sm leading-relaxed text-muted">
                          Pasanos tu altura y cómo te gusta que te quede, y te recomendamos el talle.
                          <a
                            [href]="sizeHelpWhatsAppUrl()"
                            target="_blank"
                            rel="noopener"
                            class="font-semibold text-ink underline decoration-2 underline-offset-4 hover:text-accent-deep"
                          >Preguntar por WhatsApp<span class="sr-only"> (se abre en otra pestaña)</span></a>
                        </p>
                      }
                    </details>
                  </fieldset>

                  <div>
                    <label for="product-quantity" class="mb-3 block text-sm font-semibold uppercase tracking-wide">
                      Cantidad
                    </label>
                    <app-quantity-stepper
                      inputId="product-quantity"
                      [value]="quantity()"
                      (valueChange)="quantity.set($event)"
                      [max]="availableQuantity() > 0 ? availableQuantity() : 1"
                      [disabled]="availableQuantity() === 0"
                      describedBy="quantity-hint"
                    />
                    @if (currentCartQuantity() > 0) {
                      @if (availableQuantity() === 0) {
                        <p id="quantity-hint" class="mt-2 bg-[#fde8ea] px-3 py-2 text-sm font-semibold text-[#8a1020]">
                          Ya tenés {{ MAX_QUANTITY }} en el carrito, el máximo por pedido. Para más, escribinos por WhatsApp.
                        </p>
                      } @else {
                        <p id="quantity-hint" class="mt-2 bg-[#fdf3d0] px-3 py-2 text-sm font-semibold text-[#5c4300]">
                          Ya tenés {{ currentCartQuantity() }} en el carrito. Podés agregar {{ availableQuantity() }} más.
                        </p>
                      }
                    } @else {
                      <p id="quantity-hint" class="mt-2 text-sm text-muted">
                        Hasta {{ MAX_QUANTITY }} por pedido.
                        @if (firstTier(); as tier) {
                          Llevando {{ tier.minQuantity }} prendas o más, aunque sean distintas, tenés {{ tier.discountPercent }}% off.
                        }
                      </p>
                    }
                  </div>

                  @if (showValidationError()) {
                    <p role="alert" class="bg-[#fdf3d0] px-3 py-2 text-sm font-semibold text-[#5c4300]">
                      {{ selectedColor() ? 'Elegí un talle para continuar.' : 'Elegí color y talle para continuar.' }}
                    </p>
                  }

                  @if (showQuantityExceededError()) {
                    <p role="alert" class="bg-[#fdf3d0] px-3 py-2 text-sm font-semibold text-[#5c4300]">
                      Podés agregar hasta {{ availableQuantity() }} unidades más de esta remera.
                    </p>
                  }
                </div>

                <!-- Botones de acción -->
                <div class="mt-8 grid gap-3">
                  <button
                    type="button"
                    [disabled]="availableQuantity() === 0"
                    (click)="addToCart()"
                    class="on-accent min-h-14 bg-accent px-5 font-semibold text-white transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-muted"
                  >
                    Agregar al carrito
                  </button>
                  <button
                    type="button"
                    [disabled]="availableQuantity() === 0"
                    (click)="buyNow()"
                    class="min-h-12 border-2 border-ink px-5 font-semibold text-ink transition-colors duration-200 hover:bg-ink hover:text-bone disabled:cursor-not-allowed disabled:border-muted disabled:text-muted disabled:hover:bg-transparent"
                  >
                    Agregar e ir al carrito
                  </button>
                </div>
                <dl class="mt-6 grid gap-2 border-t border-rule pt-5 text-sm">
                  <div class="flex gap-2">
                    <dt class="w-20 shrink-0 font-semibold">Pago</dt>
                    <dd class="text-muted">{{ storeInfo.payment }}, al confirmar por WhatsApp.</dd>
                  </div>
                  <div class="flex gap-2">
                    <dt class="w-20 shrink-0 font-semibold">Entrega</dt>
                    <dd class="text-muted">{{ deliveryFact }}</dd>
                  </div>
                </dl>
              }

              <div class="mt-10 border-t border-rule pt-6">
                <app-share-buttons
                  [path]="'/product/' + productData.id"
                  [title]="productData.name + ' · BLAK Streetwear'"
                  [text]="'Mirá esta remera: ' + productData.name" />
              </div>
            </div>
          </div>

          <!-- Productos relacionados -->
          @if (relatedProducts().length > 0) {
            <section class="mt-32 md:mt-44">
              <div class="mb-10 flex items-end justify-between gap-5">
                <h2 class="max-w-[10ch] text-5xl font-black uppercase leading-[0.9] md:text-7xl">También te puede gustar</h2>
                <a routerLink="/products" class="min-h-11 content-center font-semibold underline decoration-2 underline-offset-4 hover:text-accent">
                  Ver todo
                </a>
              </div>
              <div class="grid grid-cols-1 gap-x-5 gap-y-16 min-[520px]:grid-cols-2 lg:grid-cols-3">
                @for (related of relatedProducts(); track related.id) {
                  <app-product-card [product]="related" />
                }
              </div>
            </section>
          }
        </div>
      </div>
    } @else if (isLoading()) {
      <div class="min-h-[100svh] bg-bone" role="status" aria-label="Cargando remera"></div>
    } @else {
      <div class="flex min-h-[70svh] items-center bg-ink px-4 text-bone md:px-8">
        <div>
          <h1 class="max-w-[10ch] text-7xl font-black uppercase leading-[0.86] md:text-9xl">Producto no encontrado</h1>
          <a routerLink="/products" class="mt-8 inline-flex min-h-12 items-center bg-accent px-6 font-semibold text-white">
            Volver a la colección
          </a>
        </div>
      </div>
    }
  `
})
export class ProductDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private toastService = inject(ToastService);
  private title = inject(Title);
  private meta = inject(Meta);
  private wishlistService = inject(WishlistService);
  protected volumeDiscount = inject(VolumeDiscountService);
  protected firstTier = this.volumeDiscount.firstTier;

  // Señal y no snapshot: al ir de una remera a otra (relacionadas) Angular reutiliza el componente
  private productId = toSignal(this.route.paramMap.pipe(map(params => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id')
  });

  readonly getColorHex = getColorHex;
  readonly storeInfo = STORE_INFO;
  readonly sizeChart = STORE_INFO.sizeChart;
  readonly deliveryFact = STORE_INFO.shippingArea
    ? `Retiro o envío en ${STORE_INFO.shippingArea}, se coordina por WhatsApp.`
    : `Retiro o envío en ${STORE_INFO.city}, se coordina por WhatsApp.`;

  isLoading = this.productService.isLoading;
  product = computed<Product | null>(() => {
    const id = this.productId();
    return id ? this.productService.getProductById(id) ?? null : null;
  });

  isSoldOut = computed(() => (this.product()?.colors.length ?? 0) === 0);

  isFavorite = computed(() => {
    const productData = this.product();
    return productData ? this.wishlistService.isInWishlist(productData.id) : false;
  });

  // Si hay un único color, queda elegido de entrada
  selectedColor = linkedSignal<string | null>(() => {
    const colors = this.product()?.colors ?? [];
    return colors.length === 1 ? colors[0] : null;
  });

  /** Talles del color elegido (o de todos, si todavía no eligió color), marcando los agotados. */
  sizeOptions = computed(() => {
    const color = this.selectedColor();
    const variants = (this.product()?.variants ?? []).filter(variant => !color || variant.color === color);
    return SIZE_ORDER
      .filter(size => variants.some(variant => variant.size === size))
      .map(size => ({ size, available: variants.some(variant => variant.size === size && variant.available) }));
  });

  // Conserva el talle elegido si sigue disponible; si queda uno solo, lo elige
  selectedSize = linkedSignal<string[], string | null>({
    source: () => this.sizeOptions().filter(option => option.available).map(option => option.size),
    computation: (available, previous) => {
      if (previous?.value && available.includes(previous.value)) return previous.value;
      return available.length === 1 ? available[0] : null;
    }
  });

  activeImage = linkedSignal(() => {
    this.product();
    return 0;
  });

  quantity = signal<number>(1);
  showValidationError = signal(false);
  showQuantityExceededError = signal(false);

  readonly MAX_QUANTITY = this.cartService.getMaxQuantity();

  relatedProducts = computed(() => {
    const current = this.product();
    if (!current) return [];
    return this.productService.getRelatedProducts(current.id, 3);
  });

  currentCartQuantity = computed(() => {
    const productData = this.product();
    const size = this.selectedSize();
    const color = this.selectedColor();

    if (!productData || !size || !color) return 0;

    return this.cartService.getItemQuantity(productData.id, size, color);
  });

  availableQuantity = computed(() => {
    return Math.max(0, this.MAX_QUANTITY - this.currentCartQuantity());
  });

  sizeHelpWhatsAppUrl = computed(() =>
    getWhatsAppUrl(`Hola! Quiero la remera "${this.product()?.name}" y necesito ayuda con el talle. Mido: `)
  );

  soldOutWhatsAppUrl = computed(() =>
    getWhatsAppUrl(`Hola! Quería saber si va a volver a haber stock de la remera "${this.product()?.name}".`)
  );

  constructor() {
    // Links viejos (/product/006) → URL nueva con el nombre
    effect(() => {
      const id = this.productId();
      const slug = id ? LEGACY_PRODUCT_IDS[id] : undefined;
      if (slug) {
        this.router.navigate(['/product', slug], { replaceUrl: true });
      }
    });

    const defaultDescription = this.meta.getTag('name="description"')?.content ?? '';
    effect(() => {
      const productData = this.product();
      if (!productData) return;
      // Igual que el HTML estático de la remera (scripts/build-static-pages.mjs)
      this.title.setTitle(productSeoTitle(productData));
      this.meta.updateTag({ name: 'description', content: productSeoDescription(productData) });
    });
    inject(DestroyRef).onDestroy(() => this.meta.updateTag({ name: 'description', content: defaultDescription }));
  }

  toggleFavorite(): void {
    const productData = this.product();
    if (productData) {
      this.wishlistService.toggle(productData.id);
    }
  }

  addToCart(): void {
    const added = this.addSelectionToCart();
    if (!added) return;

    this.toastService.show('Agregado al carrito', `${added.productName} · Talle ${added.size} · ${added.color}`, {
      label: 'Ver carrito',
      link: '/cart'
    });
  }

  buyNow(): void {
    if (this.addSelectionToCart()) {
      this.router.navigate(['/cart']);
    }
  }

  private addSelectionToCart(): CartItem | null {
    const productData = this.product();
    const size = this.selectedSize();
    const color = this.selectedColor();

    if (!productData || !size || !color) {
      this.showValidationError.set(true);
      this.showQuantityExceededError.set(false);
      return null;
    }

    if (this.quantity() > this.availableQuantity()) {
      this.showQuantityExceededError.set(true);
      this.showValidationError.set(false);
      return null;
    }

    const cartItem: CartItem = {
      productId: productData.id,
      productName: productData.name,
      price: productData.price,
      size: size as ProductSize,
      color,
      image: productData.images[0],
      quantity: this.quantity()
    };

    this.cartService.addItem(cartItem);
    this.showValidationError.set(false);
    this.showQuantityExceededError.set(false);
    return cartItem;
  }
}
