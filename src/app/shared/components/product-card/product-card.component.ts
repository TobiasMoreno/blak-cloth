import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../core/models/product.model';
import { WishlistService } from '../../../core/services/wishlist.service';
import { getColorHex } from '../../../core/constants/colors.constants';
import { CurrencyArsPipe } from '../../pipes/currency-ars.pipe';

const NEW_PRODUCT_DAYS = 30;

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, NgOptimizedImage, CurrencyArsPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="group relative">
      <button
        type="button"
        (click)="toggleWishlist($event)"
        [attr.aria-label]="isFavorite() ? 'Quitar ' + product().name + ' de favoritos' : 'Agregar ' + product().name + ' a favoritos'"
        [attr.aria-pressed]="isFavorite()"
        class="absolute right-3 top-3 z-10 flex min-h-11 min-w-11 items-center justify-center bg-bone text-ink transition-colors duration-200 hover:bg-accent hover:text-white"
      >
        <i [class]="isFavorite() ? 'pi pi-heart-fill text-accent' : 'pi pi-heart'" aria-hidden="true"></i>
      </button>

      @if (isNew()) {
        <span class="absolute left-3 top-3 z-10 bg-accent px-3 py-1 text-sm font-semibold uppercase tracking-wide text-white">
          Nuevo
        </span>
      }

      <a [routerLink]="['/product', product().id]" class="block">
        <div class="relative aspect-[4/3] overflow-hidden bg-surface">
          <img
            [ngSrc]="product().images[0]"
            [alt]="product().name"
            width="1200"
            height="800"
            sizes="(min-width: 1024px) 33vw, (min-width: 520px) 50vw, 100vw"
            [priority]="priority()"
            [style.view-transition-name]="'product-' + product().id"
            class="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-90"
          />
          @if (product().hoverImage; as hoverImage) {
            <img
              [ngSrc]="hoverImage"
              alt=""
              width="1200"
              height="800"
              sizes="(min-width: 1024px) 33vw, (min-width: 520px) 50vw, 100vw"
              class="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          }
        </div>

        <div class="pt-5">
          <div class="flex items-start justify-between gap-4">
            <h3 class="max-w-[13ch] text-3xl font-black uppercase leading-[0.92] transition-colors duration-200 group-hover:text-accent">
              {{ product().name }}
            </h3>
            <p class="shrink-0 text-lg font-semibold tabular-nums">
              {{ product().price | currencyArs }}
            </p>
          </div>

          <div class="mt-5 flex items-center justify-between gap-4 text-sm text-muted">
            @if (product().sizes.length > 0) {
              <span>Talles {{ product().sizes.join(' · ') }}</span>
            } @else {
              <span class="font-semibold text-ink">Sin stock</span>
            }
            <span role="img" [attr.aria-label]="'Colores disponibles: ' + product().colors.join(', ')" class="flex gap-2">
              @for (color of product().colors; track color) {
                <span
                  class="inline-block h-4 w-4 rounded-full border border-field"
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
  /** Cargar la foto con prioridad: solo para las tarjetas visibles al entrar a la página. */
  priority = input(false);

  readonly getColorHex = getColorHex;

  isFavorite = computed(() => this.wishlistService.isInWishlist(this.product().id));

  isNew = computed(() => {
    const createdAt = this.product().createdAt;
    if (!createdAt) return false;
    const ageInDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
    return ageInDays >= 0 && ageInDays <= NEW_PRODUCT_DAYS;
  });

  toggleWishlist(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlistService.toggle(this.product().id);
  }
}
