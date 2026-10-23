import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-50 bg-[#f4f4f0] text-[#0b0b0b]">
      <nav class="flex min-h-16 items-center justify-between px-4 md:px-8" aria-label="Navegación principal">
        <a
          routerLink="/"
          class="font-display text-3xl font-black uppercase leading-none tracking-[-0.03em] transition-colors duration-200 hover:text-[#ed1c2f]"
          aria-label="LM Studio, inicio"
        >
          LM Studio
        </a>

        <div class="hidden items-center gap-8 md:flex">
          <a
            routerLink="/"
            routerLinkActive="text-[#ed1c2f]"
            [routerLinkActiveOptions]="{ exact: true }"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-[#ed1c2f]"
          >
            Inicio
          </a>
          <a
            routerLink="/products"
            routerLinkActive="text-[#ed1c2f]"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-[#ed1c2f]"
          >
            Colección
          </a>
          <a
            routerLink="/about"
            routerLinkActive="text-[#ed1c2f]"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-[#ed1c2f]"
          >
            El estudio
          </a>
          <a
            routerLink="/cart"
            class="relative flex min-h-11 items-center gap-2 bg-[#0b0b0b] px-4 text-sm font-semibold text-[#f4f4f0] transition-colors duration-200 hover:bg-[#ed1c2f]"
            aria-label="Abrir carrito"
          >
            Carrito
            @if (cartService.totalItems() > 0) {
              <span
                [class.cart-badge-pop]="badgeAnimating()"
                class="inline-flex min-h-6 min-w-6 items-center justify-center bg-[#ed1c2f] px-1 text-xs text-white"
              >
                {{ cartService.totalItems() }}
              </span>
            }
          </a>
        </div>

        <button
          type="button"
          class="min-h-11 min-w-14 text-right font-semibold md:hidden"
          (click)="toggleMenu()"
          [attr.aria-expanded]="mobileMenuOpen()"
          aria-controls="mobile-navigation"
        >
          {{ mobileMenuOpen() ? 'Cerrar' : 'Menú' }}
        </button>
      </nav>

      @if (mobileMenuOpen()) {
        <div id="mobile-navigation" class="absolute inset-x-0 top-16 min-h-[calc(100svh-4rem)] bg-[#0b0b0b] px-4 py-10 text-[#f4f4f0] md:hidden">
          <div class="flex flex-col">
            <a routerLink="/" (click)="closeMenu()" class="font-display text-6xl font-black uppercase leading-[1.05] hover:text-[#ed1c2f]">
              Inicio
            </a>
            <a routerLink="/products" (click)="closeMenu()" class="font-display text-6xl font-black uppercase leading-[1.05] hover:text-[#ed1c2f]">
              Colección
            </a>
            <a routerLink="/about" (click)="closeMenu()" class="font-display text-6xl font-black uppercase leading-[1.05] hover:text-[#ed1c2f]">
              Estudio
            </a>
            <a routerLink="/cart" (click)="closeMenu()" class="mt-12 flex min-h-14 items-center justify-between bg-[#ed1c2f] px-5 font-semibold text-white">
              Ver carrito
              <span>{{ cartService.totalItems() }} prendas</span>
            </a>
          </div>
        </div>
      }
    </header>
  `
})
export class HeaderComponent {
  cartService = inject(CartService);
  mobileMenuOpen = signal(false);
  badgeAnimating = signal(false);

  private previousCount = this.cartService.totalItems();
  private animationTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const count = this.cartService.totalItems();
      if (count > this.previousCount) {
        this.badgeAnimating.set(false);
        if (this.animationTimeout) {
          clearTimeout(this.animationTimeout);
        }
        queueMicrotask(() => this.badgeAnimating.set(true));
        this.animationTimeout = setTimeout(() => this.badgeAnimating.set(false), 260);
      }
      this.previousCount = count;
    });
  }

  closeMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }
}
