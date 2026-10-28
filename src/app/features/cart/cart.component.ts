import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../core/services/cart.service';
import { CurrencyArsPipe } from '../../shared/pipes/currency-ars.pipe';
import { getWhatsAppUrl } from '../../core/constants/whatsapp.constants';
import { CartItem } from '../../core/models/cart-item.model';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';

const DELIVERY_TYPE_STORAGE_KEY = 'lm-studio-delivery-type';
const DELIVERY_ADDRESS_STORAGE_KEY = 'lm-studio-delivery-address';

@Component({
  selector: 'app-cart',
  imports: [
    CommonModule,
    RouterLink,
    NgOptimizedImage,
    FormsModule,
    CurrencyArsPipe,
    ButtonModule,
    InputNumberModule,
    RadioButtonModule,
    InputTextModule,
    DialogModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-[100svh] bg-[#f4f4f0] px-4 py-14 md:px-8 md:py-20">
      <div>
        <h1 class="max-w-[8ch] text-7xl font-black uppercase leading-[0.82] ">Tu carrito</h1>

        @if (cartService.isEmpty()) {
          <div class="mt-16 bg-[#0b0b0b] px-5 py-20 text-[#f4f4f0] md:px-10">
            <h2 class="max-w-[9ch] text-6xl font-black uppercase leading-[0.88] md:text-8xl">Todavía no elegiste una obra</h2>
            <p class="mt-8 max-w-md text-lg leading-relaxed text-[#b8b8b2]">Agregá remeras desde la colección para empezar a armar tu pedido.</p>
            <a routerLink="/products" class="mt-8 inline-flex min-h-12 items-center bg-[#d9182b] px-6 font-semibold text-white hover:bg-[#c91425]">
              Explorar la colección
            </a>
          </div>
        } @else {
          <div class="mt-16 grid grid-cols-1 gap-10 lg:grid-cols-12">
            <!-- Lista de productos -->
            <div class="space-y-5 lg:col-span-8">
              @for (item of cartService.getCartItems()(); track item.productId + item.size + item.color; let first = $first) {
                <article class="flex flex-col gap-5 bg-[#e7e7e1] p-4 sm:flex-row sm:items-center">
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

                  <div class="flex-1">
                    <h2 class="text-3xl font-black uppercase leading-none">
                      <a
                        [routerLink]="['/product', item.productId]"
                        class="underline decoration-transparent decoration-2 underline-offset-4 transition-colors duration-200 hover:text-[#a3111f] hover:decoration-current"
                      >
                        {{ item.productName }}
                      </a>
                    </h2>
                    <p class="mb-3 mt-3 text-sm text-[#555550]">
                      Talle: {{ item.size }} | Color: {{ item.color }}
                    </p>
                    <p class="text-lg font-semibold tabular-nums">
                      {{ (item.price * item.quantity) | currencyArs }}
                    </p>
                  </div>

                  <div class="flex flex-col items-end gap-2">
                    <label [for]="'cart-quantity-' + item.productId" class="sr-only">
                      Cantidad de {{ item.productName }}
                    </label>
                    <p-inputNumber
                      [inputId]="'cart-quantity-' + item.productId"
                      [ngModel]="item.quantity"
                      [min]="1"
                      [max]="5"
                      [showButtons]="true"
                      (ngModelChange)="updateQuantity(item, $event)">
                    </p-inputNumber>
                    <button 
                      type="button"
                      (click)="removeItem(item)"
                      [attr.aria-label]="'Eliminar ' + item.productName + ' talle ' + item.size"
                      class="min-h-11 text-sm font-semibold text-[#a3111f] underline decoration-2 underline-offset-4 hover:text-[#7f0d18]">
                      Eliminar
                    </button>
                  </div>
                </article>
              }
            </div>

            <!-- Resumen -->
            <div class="lg:col-span-4">
              <div class="sticky top-24 bg-[#0b0b0b] p-6 text-[#f4f4f0] md:p-8">
                <h2 class="mb-8 text-5xl font-black uppercase">Resumen</h2>
                
                <div class="space-y-3 mb-6">
                  <div class="flex justify-between text-[#b8b8b2]">
                    <span>Subtotal</span>
                    <span>{{ cartService.totalPrice() | currencyArs }}</span>
                  </div>
                  <div class="flex justify-between gap-4 text-[#b8b8b2]">
                    <span>Envío</span>
                    <span class="text-sm">Se coordina por WhatsApp</span>
                  </div>
                  <div class="flex justify-between bg-[#292927] p-4 text-xl font-semibold tabular-nums">
                    <span>Total</span>
                    <span>{{ cartService.totalPrice() | currencyArs }}</span>
                  </div>
                </div>

                <!-- Tipo de entrega -->
                <div class="mb-6">
                  <h3 class="mb-4 text-lg font-semibold">Tipo de entrega</h3>
                  <div class="space-y-3">
                    <div class="flex items-center">
                      <p-radioButton 
                        inputId="retiro"
                        value="retiro"
                        [ngModel]="deliveryType()"
                        (ngModelChange)="onDeliveryTypeChange($event)"
                        styleClass="mr-2">
                      </p-radioButton>
                      <label for="retiro" class="ml-2 cursor-pointer text-[#f4f4f0]">Retiro en local</label>
                    </div>
                    <div class="flex items-center">
                      <p-radioButton 
                        inputId="envio"
                        value="envio"
                        [ngModel]="deliveryType()"
                        (ngModelChange)="onDeliveryTypeChange($event)"
                        styleClass="mr-2">
                      </p-radioButton>
                      <label for="envio" class="ml-2 cursor-pointer text-[#f4f4f0]">Envío a domicilio</label>
                    </div>
                  </div>
                </div>

                <!-- Campo de dirección (solo si es envío) -->
                @if (deliveryType() === 'envio') {
                  <div class="mb-6">
                    <label for="delivery-address" class="mb-2 block text-sm font-medium text-[#f4f4f0]">
                      Dirección de envío <span class="text-red-500">*</span>
                    </label>
                    <div class="space-y-2">
                      <input
                        type="text"
                        id="delivery-address"
                        pInputText
                        [ngModel]="deliveryAddress()"
                        (ngModelChange)="onAddressChange($event)"
                        placeholder="Calle, número, barrio"
                        class="min-h-12 w-full bg-[#f4f4f0] px-3 text-[#0b0b0b]"
                        [class.border-red-500]="showAddressError() && !deliveryAddress()">
                      <p class="flex items-start gap-1.5 text-sm leading-relaxed text-[#b8b8b2]">
                        <i class="pi pi-info-circle mt-0.5"></i>
                        <span>Si no estás seguro de la dirección exacta, podés coordinarla por WhatsApp después.</span>
                      </p>
                      @if (showAddressError() && !deliveryAddress()) {
                        <p role="alert" class="bg-[#3a0d12] px-3 py-2 text-sm font-semibold text-[#ffc2c7]">
                          Ingresá una dirección de envío para continuar.
                        </p>
                      }
                    </div>
                  </div>
                }

                <button
                  type="button"
                  (click)="checkout()"
                  class="min-h-14 w-full bg-[#d9182b] px-5 font-semibold text-white transition-colors duration-200 hover:bg-[#c91425]"
                >
                  Finalizar por WhatsApp
                </button>

                <p class="mb-4 mt-4 text-center text-sm leading-relaxed text-[#b8b8b2]">
                  Tu pedido se confirma vía WhatsApp y se paga por transferencia.
                </p>

                <a routerLink="/products" class="flex min-h-12 items-center justify-center font-semibold underline decoration-2 underline-offset-4 hover:text-[#d9182b]">
                  Seguir comprando
                </a>
              </div>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Modal de confirmación -->
    <p-dialog 
      [visible]="showConfirmDialog()"
      (visibleChange)="showConfirmDialog.set($event)"
      [modal]="true"
      [style]="{ width: '90%', maxWidth: '500px' }"
      [closable]="true"
      [draggable]="false"
      [resizable]="false">
      <ng-template pTemplate="header">
        <div class="flex items-center gap-2">
          <i class="pi pi-exclamation-triangle text-2xl"></i>
          <h3 class="text-xl font-semibold m-0">Confirmar compra</h3>
        </div>
      </ng-template>
      <div class="py-4 px-1">
        <p class="mb-4">
          ¿Estás seguro de que querés finalizar la compra? Se abrirá WhatsApp para completar el pedido.
        </p>
        <p class="text-sm">
          El carrito se vaciará después de confirmar.
        </p>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex gap-3 justify-end">
          <p-button 
            label="Cancelar"
            (onClick)="showConfirmDialog.set(false)"
            [text]="true"
            severity="secondary"
            styleClass="px-6">
          </p-button>
          <p-button 
            label="Confirmar"
            (onClick)="confirmCheckout()"
            severity="success"
            styleClass="px-6">
          </p-button>
        </div>
      </ng-template>
    </p-dialog>
  `
})
export class CartComponent {
  cartService = inject(CartService);

  deliveryType = signal<'retiro' | 'envio' | null>(null);
  deliveryAddress = signal<string>('');
  showAddressError = signal(false);
  showConfirmDialog = signal(false);

  constructor() {
    // Cargar datos guardados al inicializar
    const savedType = this.loadDeliveryType();
    const savedAddress = this.loadDeliveryAddress();
    
    if (savedType) {
      this.deliveryType.set(savedType);
    }
    if (savedAddress) {
      this.deliveryAddress.set(savedAddress);
    }
  }

  updateQuantity(item: CartItem, quantity: number): void {
    this.cartService.updateQuantity(item.productId, item.size, item.color, quantity);
  }

  removeItem(item: CartItem): void {
    this.cartService.removeItem(item.productId, item.size, item.color);
  }

  onDeliveryTypeChange(type: 'retiro' | 'envio'): void {
    this.deliveryType.set(type);
    this.saveDeliveryType(type);
    
    if (type === 'retiro') {
      // No limpiar la dirección, solo ocultar el campo
      this.showAddressError.set(false);
    } else if (type === 'envio') {
      // Si cambia a envío, cargar la dirección guardada si existe
      const savedAddress = this.loadDeliveryAddress();
      if (savedAddress) {
        this.deliveryAddress.set(savedAddress);
      }
    }
  }

  onAddressChange(address: string): void {
    this.deliveryAddress.set(address);
    // Guardar en localStorage cada vez que cambia
    this.saveDeliveryAddress(address);
  }

  checkout(): void {
    const deliveryType = this.deliveryType();

    // Validar que se haya seleccionado un tipo de entrega
    if (!deliveryType) {
      // Podrías mostrar un mensaje aquí si quieres
      return;
    }

    // Validar que si es envío, tenga dirección
    if (deliveryType === 'envio') {
      if (!this.deliveryAddress() || this.deliveryAddress().trim() === '') {
        this.showAddressError.set(true);
        return;
      }
    }

    // Guardar la dirección actualizada antes de mostrar el modal
    if (deliveryType === 'envio' && this.deliveryAddress()) {
      this.saveDeliveryAddress(this.deliveryAddress());
    }
    this.saveDeliveryType(deliveryType);

    // Mostrar modal de confirmación
    this.showAddressError.set(false);
    this.showConfirmDialog.set(true);
  }

  confirmCheckout(): void {
    // Cerrar el modal
    this.showConfirmDialog.set(false);

    const items = this.cartService.getCartItems()();
    const total = this.cartService.totalPrice();

    let message = 'Hola! Quiero comprar las siguientes remeras:\n\n';
    
    items.forEach((item, index) => {
      message += `${index + 1}. Modelo: ${item.productName}\n`;
      message += `   - Talle: ${item.size}\n`;
      message += `   - Color: ${item.color}\n`;
      message += `   - Cantidad: ${item.quantity}\n\n`;
    });

    message += `Total: $${total.toLocaleString('es-AR')}\n\n`;

    // Agregar información de entrega
    if (this.deliveryType() === 'retiro') {
      message += 'Tipo de entrega: Retiro en local\n';
    } else if (this.deliveryType() === 'envio') {
      message += `Tipo de entrega: Envío a domicilio\n`;
      message += `Dirección: ${this.deliveryAddress()}\n`;
    }

    // Limpiar el carrito del localStorage
    this.cartService.clearCart();

    // Abrir WhatsApp
    window.open(getWhatsAppUrl(message), '_blank');
  }

  private loadDeliveryType(): 'retiro' | 'envio' | null {
    try {
      const stored = localStorage.getItem(DELIVERY_TYPE_STORAGE_KEY);
      return stored === 'retiro' || stored === 'envio' ? stored : null;
    } catch {
      return null;
    }
  }

  private saveDeliveryType(type: 'retiro' | 'envio'): void {
    try {
      localStorage.setItem(DELIVERY_TYPE_STORAGE_KEY, type);
    } catch (error) {
      console.error('Error saving delivery type to localStorage:', error);
    }
  }

  private loadDeliveryAddress(): string {
    try {
      const stored = localStorage.getItem(DELIVERY_ADDRESS_STORAGE_KEY);
      return stored || '';
    } catch {
      return '';
    }
  }

  private saveDeliveryAddress(address: string): void {
    try {
      // Siempre guardar la dirección, incluso si está vacía
      // Esto permite mantener la dirección guardada aunque se cambie el tipo de entrega
      localStorage.setItem(DELIVERY_ADDRESS_STORAGE_KEY, address || '');
    } catch (error) {
      console.error('Error saving delivery address to localStorage:', error);
    }
  }
}
