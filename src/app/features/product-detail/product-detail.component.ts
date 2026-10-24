import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { CartService } from '../../core/services/cart.service';
import { Product } from '../../core/models/product.model';
import { CartItem } from '../../core/models/cart-item.model';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-product-detail',
  imports: [
    CommonModule,
    RouterLink,
    NgOptimizedImage,
    FormsModule,
    CurrencyArsPipe,
    InputNumberModule,
    MessageModule,
    ProductCardComponent
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
            <div class="flex gap-3 lg:col-span-7">
              @if (productData.images.length > 1) {
                <div class="flex flex-col gap-2 w-16 md:w-20 shrink-0" role="tablist" aria-label="Imágenes del producto">
                  @for (img of productData.images; track img; let i = $index) {
                    <button
                      type="button"
                      role="tab"
                      [attr.aria-selected]="activeImage() === i"
                      (click)="activeImage.set(i)"
                      [class]="activeImage() === i
                        ? 'aspect-square bg-[#e7e7e1] overflow-hidden ring-4 ring-[#0b0b0b] cursor-pointer'
                        : 'aspect-square bg-[#e7e7e1] overflow-hidden opacity-60 hover:opacity-100 cursor-pointer'">
                      <img [ngSrc]="img"
                           [alt]="productData.name + ' vista ' + (i + 1)"
                           width="200"
                           height="200"
                           class="w-full h-full object-cover">
                    </button>
                  }
                </div>
              }
              <div class="flex-1">
                <div class="aspect-[4/3] overflow-hidden bg-[#e7e7e1] lg:sticky lg:top-24">
                  <img [ngSrc]="productData.images[activeImage()] || productData.images[0]"
                       [alt]="productData.name"
                       width="1200"
                       height="1200"
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
              
              <p class="mt-8 text-2xl font-semibold tabular-nums">
                {{ productData.price | currencyArs }}
              </p>

              <p class="mb-10 mt-8 max-w-[40ch] text-lg leading-relaxed text-[#555550]">
                {{ productData.description }}
              </p>

              <!-- Selección de talle y color -->
              <div class="space-y-6 mb-8">
                <div>
                  <div class="flex items-baseline justify-between mb-3">
                    <label class="text-sm font-medium text-gray-900">
                      Talle <span class="text-red-500">*</span>
                    </label>
                    @if (selectedSize()) {
                      <span class="text-sm text-gray-600">Seleccionado: <span class="font-semibold text-gray-900">{{ selectedSize() }}</span></span>
                    }
                  </div>
                  <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Talle">
                    @for (size of productData.sizes; track size) {
                      <button
                        type="button"
                        role="radio"
                        [attr.aria-checked]="selectedSize() === size"
                        (click)="selectedSize.set(size)"
                        [class]="selectedSize() === size
                          ? 'min-h-12 min-w-12 bg-[#0b0b0b] px-4 font-semibold text-[#f4f4f0]'
                          : 'min-h-12 min-w-12 bg-[#e7e7e1] px-4 font-semibold text-[#0b0b0b] transition-colors duration-200 hover:bg-[#d6d6cf]'">
                        {{ size }}
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <div class="flex items-baseline justify-between mb-3">
                    <label class="text-sm font-medium text-gray-900">
                      Color <span class="text-red-500">*</span>
                    </label>
                    @if (selectedColor()) {
                      <span class="text-sm text-gray-600">Seleccionado: <span class="font-semibold text-gray-900">{{ selectedColor() }}</span></span>
                    }
                  </div>
                  <div class="flex flex-wrap gap-3" role="radiogroup" aria-label="Color">
                    @for (color of productData.colors; track color) {
                      <button
                        type="button"
                        role="radio"
                        [attr.aria-checked]="selectedColor() === color"
                        [attr.aria-label]="color"
                        [title]="color"
                        (click)="selectedColor.set(color)"
                        [class]="selectedColor() === color
                          ? 'flex min-h-12 items-center gap-2 bg-[#0b0b0b] px-4 text-[#f4f4f0]'
                          : 'flex min-h-12 items-center gap-2 bg-[#e7e7e1] px-4 transition-colors duration-200 hover:bg-[#d6d6cf]'">
                        <span
                          class="inline-block w-5 h-5 rounded-full border border-gray-300"
                          [style.background-color]="getColorHex(color)">
                        </span>
                        <span class="text-sm font-medium">{{ color }}</span>
                      </button>
                    }
                  </div>
                </div>

                <div>
                  <label for="product-quantity" class="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad (máximo 5 unidades)
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
                    <p class="text-xs text-gray-500 mt-2">
                      <i class="pi pi-info-circle"></i>
                      Para más de 5 unidades, consultá disponibilidad por WhatsApp.
                    </p>
                  }
                </div>

                @if (showValidationError()) {
                  <p-message severity="warn" text="Por favor selecciona talle y color" />
                }
                
                @if (showQuantityExceededError() && currentCartQuantity() > 0) {
                  <p-message 
                    severity="warn" 
                    [text]="'No se pueden agregar más de ' + availableQuantity() + ' unidades. Ya tenés ' + currentCartQuantity() + ' en el carrito.'" />
                } @else if (showQuantityExceededError()) {
                  <p-message 
                    severity="info" 
                    [text]="'Para más de 5 unidades, consultá disponibilidad por WhatsApp. Se abrirá WhatsApp para consultar.'" />
                }
              </div>

              <!-- Botones de acción -->
              <div class="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  [disabled]="!canAddToCart()"
                  (click)="addToCart()"
                  class="min-h-14 bg-[#0b0b0b] px-5 font-semibold text-[#f4f4f0] transition-colors duration-200 hover:bg-[#333330] disabled:cursor-not-allowed disabled:bg-[#aaa]"
                >
                  Agregar al carrito
                </button>
                <button
                  type="button"
                  [disabled]="!canAddToCart()"
                  (click)="buyNow()"
                  class="min-h-14 bg-[#d9182b] px-5 font-semibold text-white transition-colors duration-200 hover:bg-[#c91425] disabled:cursor-not-allowed disabled:bg-[#aaa]"
                >
                  Agregar e ir al carrito
                </button>
              </div>
              <p class="mt-4 text-sm leading-relaxed text-[#555550]">
                El pedido se confirma por WhatsApp después de revisar el carrito.
              </p>
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

  private productId = this.route.snapshot.paramMap.get('id');
  isLoading = this.productService.isLoading;
  product = computed<Product | null>(() =>
    this.productId ? this.productService.getProductById(this.productId) ?? null : null
  );
  selectedSize = signal<string | null>(null);
  selectedColor = signal<string | null>(null);
  quantity = signal<number>(1);
  showValidationError = signal(false);
  showQuantityExceededError = signal(false);
  activeImage = signal(0);
  
  readonly MAX_QUANTITY = this.cartService.getMaxQuantity();

  canAddToCart = computed(() => {
    return this.selectedSize() !== null &&
           this.selectedColor() !== null &&
           this.availableQuantity() > 0;
  });

  relatedProducts = computed(() => {
    const current = this.product();
    if (!current) return [];
    return this.productService.getRelatedProducts(current.id, 4);
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

  canAddSelectedQuantity = computed(() => {
    return this.quantity() <= this.availableQuantity();
  });

  addToCart(): void {
    if (!this.canAddToCart()) {
      this.showValidationError.set(true);
      this.showQuantityExceededError.set(false);
      return;
    }

    const productData = this.product();
    const size = this.selectedSize();
    const color = this.selectedColor();
    const qty = this.quantity();
    
    if (!productData || !size || !color) return;

    // Verificar si se puede agregar la cantidad seleccionada
    if (!this.canAddSelectedQuantity()) {
      this.showQuantityExceededError.set(true);
      this.showValidationError.set(false);
      return;
    }

    // Si la cantidad disponible es menor a la seleccionada, ajustar
    const quantityToAdd = Math.min(qty, this.availableQuantity());

    const cartItem: CartItem = {
      productId: productData.id,
      productName: productData.name,
      price: productData.price,
      size: size as 'S' | 'M' | 'L' | 'XL',
      color: color,
      image: productData.images[0],
      quantity: quantityToAdd
    };

    this.cartService.addItem(cartItem);
    this.showValidationError.set(false);
    this.showQuantityExceededError.set(false);

    this.messageService.add({
      severity: 'success',
      summary: 'Agregado al carrito',
      detail: `${productData.name} · Talle ${size} · ${color}`,
      life: 3000
    });
  }

  buyNow(): void {
    if (!this.canAddToCart()) {
      this.showValidationError.set(true);
      this.showQuantityExceededError.set(false);
      return;
    }

    const productData = this.product();
    const size = this.selectedSize();
    const color = this.selectedColor();
    const qty = this.quantity();
    
    if (!productData || !size || !color) return;

    // Verificar si se puede agregar la cantidad seleccionada
    if (!this.canAddSelectedQuantity()) {
      this.showQuantityExceededError.set(true);
      this.showValidationError.set(false);
      return;
    }

    // Ajustar cantidad a la disponible
    const quantityToAdd = Math.min(qty, this.availableQuantity());

    // Agregar al carrito y redirigir al carrito para seleccionar tipo de entrega
    const cartItem: CartItem = {
      productId: productData.id,
      productName: productData.name,
      price: productData.price,
      size: size as 'S' | 'M' | 'L' | 'XL',
      color: color,
      image: productData.images[0],
      quantity: quantityToAdd
    };

    this.cartService.addItem(cartItem);
    this.showValidationError.set(false);
    this.showQuantityExceededError.set(false);
    
    // Redirigir al carrito
    this.router.navigate(['/cart']);
  }

  getColorHex(color: string): string {
    const map: Record<string, string> = {
      'negro': '#111111',
      'blanco': '#ffffff',
      'gris': '#9ca3af',
      'beige': '#e8d9b9',
      'azul marino': '#1e2a4a',
      'rojo': '#dc2626',
      'verde': '#16a34a',
      'azul': '#2563eb',
      'amarillo': '#eab308'
    };
    return map[color.toLowerCase()] ?? '#cccccc';
  }

  private consultAvailability(): void {
    const productData = this.product();
    const size = this.selectedSize();
    const color = this.selectedColor();
    const qty = this.quantity();
    
    if (!productData || !size || !color) return;

    const message = `Hola! Quisiera consultar disponibilidad para:
- Modelo: ${productData.name}
- Talle: ${size}
- Color: ${color}
- Cantidad: ${qty} unidades

¿Tienen disponibilidad de esta cantidad?`;

    window.open(getWhatsAppUrl(message), '_blank');
  }
}
