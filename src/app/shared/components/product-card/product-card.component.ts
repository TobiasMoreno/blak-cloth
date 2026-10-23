import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/product.model';
import { WishlistService } from '../../../core/services/wishlist.service';
import { CurrencyArsPipe } from '../../pipes/currency-ars.pipe';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, NgOptimizedImage, CurrencyArsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="group relative">
      <button
        type="button"
        (click)="toggleWishlist($event)"
        [attr.aria-label]="isFavorite() ? 'Quitar de favoritos' : 'Agregar a favoritos'"
        [attr.aria-pressed]="isFavorite()"
        class="absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center bg-[#f4f4f0] text-[#0b0b0b] transition-colors duration-200 hover:bg-[#ed1c2f] hover:text-white"
      >
        <i [class]="isFavorite() ? 'pi pi-heart-fill text-[#ed1c2f]' : 'pi pi-heart'"></i>
      </button>

      <a [routerLink]="['/product', product().id]" class="block">
        <div class="aspect-[4/3] overflow-hidden bg-[#e7e7e1]">
          <img
            [ngSrc]="product().images[0]"
            [alt]="product().name + ', frente y espalda'"
            width="1200"
            height="800"
            [style.view-transition-name]="'product-' + product().id"
            class="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
          />
        </div>

        <div class="pt-5">
          <div class="flex items-start justify-between gap-4">
            <h3 class="max-w-[13ch] text-3xl font-black uppercase leading-[0.92] transition-colors duration-200 group-hover:text-[#ed1c2f]">
              {{ product().name }}
            </h3>
            <p class="shrink-0 text-lg font-semibold tabular-nums">
              {{ product().price | currencyArs }}
            </p>
          </div>

          <div class="mt-5 flex items-center justify-between gap-4 text-sm text-[#555550]">
            <span>Talles {{ product().sizes.join(' · ') }}</span>
            <span [attr.aria-label]="'Colores disponibles: ' + product().colors.join(', ')" class="flex gap-2">
              @for (color of product().colors; track color) {
                <span
                  class="inline-block h-4 w-4 rounded-full"
                  [style.background-color]="getColorHex(color)"
                  [title]="color"
                ></span>
              }
            </span>
          </div>
        </div>
      </a>
    </article>
  `
})
export class ProductCardComponent {
  private wishlistService = inject(WishlistService);

  product = input.required<Product>();
  isFavorite = computed(() => this.wishlistService.isInWishlist(this.product().id));

  toggleWishlist(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggle(this.product().id);
  }

  getColorHex(color: string): string {
    const map: Record<string, string> = {
      negro: '#111111',
      blanco: '#ffffff',
      gris: '#9ca3af',
      beige: '#e8d9b9',
      'azul marino': '#1e2a4a',
      rojo: '#dc2626',
      verde: '#0b6b3a',
      azul: '#2563eb',
      amarillo: '#eab308'
    };
    return map[color.toLowerCase()] ?? '#cccccc';
  }
}
