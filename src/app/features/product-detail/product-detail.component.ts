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
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { map } from 'rxjs';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { Product, ProductSize } from '../../core/models/product.model';
import { CartItem } from '../../core/models/cart-item.model';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';
import { getColorHex } from '../../core/constants/colors.constants';
import { LEGACY_PRODUCT_IDS } from '../../core/constants/legacy-products.constants';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { ShareButtonsComponent } from '../../shared/components/share-buttons/share-buttons.component';

const SIZE_ORDER: ProductSize[] = ['S', 'M', 'L', 'XL'];

@Component({
  selector: 'app-product-detail',
  imports: [
    RouterLink,
    NgOptimizedImage,
    FormsModule,
    CurrencyArsPipe,
    InputNumberModule,
    MessageModule,
    ProductCardComponent,
    ShareButtonsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (product(); as productData) {
      <div class="min-h-[100svh] bg-[#f4f4f0] px-4 py-10 md:px-8 md:py-16">
        <div>
          <!-- Breadcrumbs -->
          <nav aria-label="Breadcrumb" class="mb-10">
            <ol class="flex items-center gap-3 text-sm text-[#555550]">
              <li><a routerLink="/" class="hover:text-[#d9182b]">Inicio</a></li>
              <li aria-hidden="true">→</li>
              <li><a routerLink="/products" class="hover:text-[#d9182b]">Colección</a></li>
              <li aria-hidden="true">→</li>
              <li class="truncate font-semibold text-[#0b0b0b]" aria-current="page">{{ productData.name }}</li>
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
                        ? 'aspect-square w-16 overflow-hidden bg-[#e7e7e1] ring-4 ring-[#0b0b0b] md:w-full'
                        : 'aspect-square w-16 overflow-hidden bg-[#e7e7e1] opacity-60 hover:opacity-100 md:w-full'">
                      <img [ngSrc]="img" alt="" width="200" height="200" class="h-full w-full object-cover">
                    </button>
                  }
                </div>
              }
              <div class="flex-1">
                <div class="aspect-[4/3] overflow-hidden bg-[#e7e7e1] lg:sticky lg:top-24">
                  <img [ngSrc]="productData.images[activeImage()] || productData.images[0]"
                       [alt]="productData.name"
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
                <p class="text-2xl font-semibold tabular-nums">
                  {{ productData.price | currencyArs }}
                </p>
                <button
                  type="button"
                  (click)="toggleFavorite()"
                  aria-label="Guardar en favoritos"
                  [attr.aria-pressed]="isFavorite()"
                  class="flex min-h-11 items-center gap-2 bg-[#e7e7e1] px-4 font-semibold transition-colors duration-200 hover:bg-[#d6d6cf]"
                >
                  <i [class]="isFavorite() ? 'pi pi-heart-fill text-[#d9182b]' : 'pi pi-heart'" aria-hidden="true"></i>
                  {{ isFavorite() ? 'En favoritos' : 'Guardar' }}
                </button>
              </div>

              @if (productData.description) {
                <p class="mt-8 max-w-[40ch] text-lg leading-relaxed text-[#555550]">
                  {{ productData.description }}
                </p>
              }

              @if (isSoldOut()) {
                <div class="mt-10 bg-[#e7e7e1] p-5">
                  <p class="font-semibold">Por ahora no hay talles disponibles.</p>
                  <a
                    [href]="soldOutWhatsAppUrl()"
                    target="_blank"
                    rel="noopener"
                    class="mt-4 flex min-h-14 items-center justify-center bg-[#0b0b0b] px-5 font-semibold text-[#f4f4f0] transition-colors duration-200 hover:bg-[#d9182b]"
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
                        class="inline-block h-4 w-4 rounded-full border border-[#888880]"
                        [style.background-color]="getColorHex(productData.colors[0])"
                        aria-hidden="true"
                      ></span>
                      {{ productData.colors[0] }}
                    </p>
                  } @else {
                    <div>
                      <p id="color-label" class="mb-3 text-sm font-semibold uppercase tracking-wide">
                        Color
                        @if (selectedColor()) {
                          <span class="font-normal normal-case tracking-normal text-[#555550]"> · {{ selectedColor() }}</span>
                        }
                      </p>
                      <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="color-label">
                        @for (color of productData.colors; track color) {
                          <button
                            type="button"
                            role="radio"
                            [attr.aria-checked]="selectedColor() === color"
                            (click)="selectedColor.set(color)"
                            [class]="selectedColor() === color
                              ? 'flex min-h-12 items-center gap-2 bg-[#0b0b0b] px-4 font-semibold text-[#f4f4f0]'
                              : 'flex min-h-12 items-center gap-2 bg-[#e7e7e1] px-4 font-semibold transition-colors duration-200 hover:bg-[#d6d6cf]'">
                            <span
                              class="inline-block h-5 w-5 rounded-full border border-[#888880]"
                              [style.background-color]="getColorHex(color)"
                              aria-hidden="true"
                            ></span>
                            {{ color }}
                          </button>
                        }
                      </div>
                    </div>
                  }

                  <div>
                    <p id="size-label" class="mb-3 text-sm font-semibold uppercase tracking-wide">Talle</p>
                    <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="size-label">
                      @for (option of sizeOptions(); track option.size) {
                        <button
                          type="button"
                          role="radio"
                          [attr.aria-checked]="selectedSize() === option.size"
                          [attr.aria-label]="option.available ? option.size : option.size + ', sin stock'"
                          [disabled]="!option.available"
                          (click)="selectedSize.set(option.size)"
                          [class]="!option.available
                            ? 'min-h-12 min-w-12 cursor-not-allowed bg-[#e7e7e1] px-4 font-semibold text-[#6b6b66] line-through'
                            : selectedSize() === option.size
                              ? 'min-h-12 min-w-12 bg-[#0b0b0b] px-4 font-semibold text-[#f4f4f0]'
                              : 'min-h-12 min-w-12 bg-[#e7e7e1] px-4 font-semibold text-[#0b0b0b] transition-colors duration-200 hover:bg-[#d6d6cf]'">
                          {{ option.size }}
                        </button>
                      }
                    </div>
                  </div>

                  <div>
                    <label for="product-quantity" class="mb-3 block text-sm font-semibold uppercase tracking-wide">
                      Cantidad
                    </label>
                    <p-inputNumber
                      inputId="product-quantity"
                      [ngModel]="quantity()"
                      (ngModelChange)="quantity.set($event)"
                      [min]="1"
                      [max]="availableQuantity() > 0 ? availableQuantity() : 1"
                      [showButtons]="true"
                      [disabled]="availableQuantity() === 0"
                      styleClass="w-full">
                    </p-inputNumber>
                    @if (currentCartQuantity() > 0) {
                      @if (availableQuantity() === 0) {
                        <p-message
                          severity="error"
                          styleClass="mt-2"
                          text="Ya tenés 5 unidades en el carrito (máximo permitido)." />
                      } @else {
                        <p-message
                          severity="warn"
                          styleClass="mt-2"
                          [text]="'Ya tenés ' + currentCartQuantity() + ' en el carrito. Podés agregar ' + availableQuantity() + ' más.'" />
                      }
                    } @else {
                      <p class="mt-2 text-sm text-[#555550]">Hasta 5 por pedido. Para más, consultanos por WhatsApp.</p>
                    }
                  </div>

                  @if (showValidationError()) {
                    <p-message
                      severity="warn"
                      [text]="selectedColor() ? 'Elegí un talle para continuar.' : 'Elegí color y talle para continuar.'" />
                  }

                  @if (showQuantityExceededError()) {
                    <p-message
                      severity="warn"
                      [text]="'Podés agregar hasta ' + availableQuantity() + ' unidades más de esta remera.'" />
                  }
                </div>

                <!-- Botones de acción -->
                <div class="mt-8 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    [disabled]="availableQuantity() === 0"
                    (click)="addToCart()"
                    class="min-h-14 bg-[#0b0b0b] px-5 font-semibold text-[#f4f4f0] transition-colors duration-200 hover:bg-[#333330] disabled:cursor-not-allowed disabled:bg-[#6b6b66]"
                  >
                    Agregar al carrito
                  </button>
                  <button
                    type="button"
                    [disabled]="availableQuantity() === 0"
                    (click)="buyNow()"
                    class="min-h-14 bg-[#d9182b] px-5 font-semibold text-white transition-colors duration-200 hover:bg-[#c91425] disabled:cursor-not-allowed disabled:bg-[#6b6b66]"
                  >
                    Comprar ahora
                  </button>
                </div>
                <p class="mt-4 text-sm leading-relaxed text-[#555550]">
                  El pedido se confirma por WhatsApp después de revisar el carrito.
                </p>
              }

              <div class="mt-10 border-t border-[#d6d6cf] pt-6">
                <app-share-buttons
                  [path]="'/product/' + productData.id"
                  [title]="productData.name + ' · BLAK CLOTH'"
                  [text]="'Mirá esta remera: ' + productData.name" />
              </div>
            </div>
          </div>

          <!-- Productos relacionados -->
          @if (relatedProducts().length > 0) {
            <section class="mt-32 md:mt-44">
              <div class="mb-10 flex items-end justify-between gap-5">
                <h2 class="max-w-[10ch] text-5xl font-black uppercase leading-[0.9] md:text-7xl">También te puede gustar</h2>
                <a routerLink="/products" class="min-h-11 content-center font-semibold underline decoration-2 underline-offset-4 hover:text-[#d9182b]">
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
      <div class="min-h-[100svh] bg-[#f4f4f0]" role="status" aria-label="Cargando remera"></div>
    } @else {
      <div class="flex min-h-[70svh] items-center bg-[#0b0b0b] px-4 text-[#f4f4f0] md:px-8">
        <div>
          <h1 class="max-w-[10ch] text-7xl font-black uppercase leading-[0.86] md:text-9xl">Producto no encontrado</h1>
          <a routerLink="/products" class="mt-8 inline-flex min-h-12 items-center bg-[#d9182b] px-6 font-semibold text-white">
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
  private messageService = inject(MessageService);
  private title = inject(Title);
  private meta = inject(Meta);
  private wishlistService = inject(WishlistService);

  // Señal y no snapshot: al ir de una remera a otra (relacionadas) Angular reutiliza el componente
  private productId = toSignal(this.route.paramMap.pipe(map(params => params.get('id'))), {
    initialValue: this.route.snapshot.paramMap.get('id')
  });

  readonly getColorHex = getColorHex;

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
      this.title.setTitle(`${productData.name} · BLAK CLOTH`);
      this.meta.updateTag({ name: 'description', content: productData.description || defaultDescription });
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

    this.messageService.add({
      severity: 'success',
      summary: 'Agregado al carrito',
      detail: `${added.productName} · Talle ${added.size} · ${added.color}`,
      life: 3000
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
