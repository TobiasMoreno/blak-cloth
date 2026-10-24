import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(window:resize)': 'onResize()',
  },
  template: `
    <header
      class="sticky top-0 z-50 bg-[#f4f4f0] text-[#0b0b0b]"
      (keydown.tab)="trapFocus($event)"
      (keydown.shift.tab)="trapFocus($event)"
    >
      <nav
        class="flex min-h-16 items-center justify-between px-4 md:px-8"
        aria-label="Navegación principal"
      >
        <a
          routerLink="/"
          class="flex min-h-11 items-center transition-opacity duration-200 hover:opacity-70"
          aria-label="BLAK CLOTH, inicio"
        >
          <img
            ngSrc="images/brand/blak-logo-black.svg"
            alt=""
            width="590"
            height="144"
            class="h-7 w-auto md:h-8"
            priority
          />
        </a>

        <div class="hidden items-center gap-8 md:flex">
          <a
            routerLink="/"
            routerLinkActive="text-[#d9182b]"
            ariaCurrentWhenActive="page"
            [routerLinkActiveOptions]="{ exact: true }"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-[#d9182b]"
          >
            Inicio
          </a>
          <a
            routerLink="/products"
            routerLinkActive="text-[#d9182b]"
            ariaCurrentWhenActive="page"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-[#d9182b]"
          >
            Colección
          </a>
          <a
            routerLink="/equipos"
            routerLinkActive="text-[#d9182b]"
            ariaCurrentWhenActive="page"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-[#d9182b]"
          >
            Para equipos
          </a>
          <a
            routerLink="/about"
            routerLinkActive="text-[#d9182b]"
            ariaCurrentWhenActive="page"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-[#d9182b]"
          >
            El estudio
          </a>
          <a
            routerLink="/products"
            [queryParams]="{ favoritas: 1 }"
            [attr.aria-label]="favoritesLabel()"
            class="flex min-h-11 min-w-11 items-center justify-center gap-2 text-sm font-semibold transition-colors duration-200 hover:text-[#d9182b]"
          >
            <i
              [class]="wishlistService.totalItems() > 0 ? 'pi pi-heart-fill text-[#d9182b]' : 'pi pi-heart'"
              aria-hidden="true"
            ></i>
            @if (wishlistService.totalItems() > 0) {
              <span class="tabular-nums" aria-hidden="true">{{ wishlistService.totalItems() }}</span>
            }
          </a>
          <a
            routerLink="/cart"
            routerLinkActive="bg-[#d9182b]"
            ariaCurrentWhenActive="page"
            class="relative flex min-h-11 items-center gap-2 bg-[#0b0b0b] px-4 text-sm font-semibold text-[#f4f4f0] transition-colors duration-200 hover:bg-[#d9182b]"
            aria-label="Abrir carrito"
          >
            Carrito
            @if (cartService.totalItems() > 0) {
              <span
                [class.cart-badge-pop]="badgeAnimating()"
                class="inline-flex min-h-6 min-w-6 items-center justify-center bg-[#d9182b] px-1 text-xs text-white"
              >
                {{ cartService.totalItems() }}
              </span>
            }
          </a>
        </div>

        <div class="flex items-center gap-2 md:hidden">
          <a
            routerLink="/products"
            [queryParams]="{ favoritas: 1 }"
            [attr.aria-label]="favoritesLabel()"
            (click)="closeMenu()"
            class="flex min-h-11 min-w-11 items-center justify-center gap-1 font-semibold"
          >
            <i
              [class]="wishlistService.totalItems() > 0 ? 'pi pi-heart-fill text-[#d9182b]' : 'pi pi-heart'"
              aria-hidden="true"
            ></i>
            @if (wishlistService.totalItems() > 0) {
              <span class="text-sm tabular-nums" aria-hidden="true">{{ wishlistService.totalItems() }}</span>
            }
          </a>
          <button
            #menuToggle
            type="button"
            class="min-h-11 min-w-14 text-right font-semibold"
            (click)="toggleMenu()"
            [attr.aria-expanded]="mobileMenuOpen()"
            aria-controls="mobile-navigation"
          >
            {{ mobileMenuOpen() ? 'Cerrar' : 'Menú' }}
          </button>
        </div>
      </nav>

      @if (mobileMenuOpen()) {
        <div
          #mobileNavigation
          id="mobile-navigation"
          class="fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-[#0b0b0b] px-4 py-10 text-[#f4f4f0] md:hidden"
        >
          <div class="flex flex-col">
            <a
              routerLink="/"
              routerLinkActive="text-[#d9182b]"
              [routerLinkActiveOptions]="{ exact: true }"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="flex min-h-16 items-center font-display text-6xl font-black uppercase leading-[1.05] hover:text-[#d9182b]"
            >
              Inicio
            </a>
            <a
              routerLink="/products"
              routerLinkActive="text-[#d9182b]"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="flex min-h-16 items-center font-display text-6xl font-black uppercase leading-[1.05] hover:text-[#d9182b]"
            >
              Colección
            </a>
            <a
              routerLink="/equipos"
              routerLinkActive="text-[#d9182b]"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="flex min-h-16 items-center font-display text-6xl font-black uppercase leading-[1.05] hover:text-[#d9182b]"
            >
              Para equipos
            </a>
            <a
              routerLink="/about"
              routerLinkActive="text-[#d9182b]"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="flex min-h-16 items-center font-display text-6xl font-black uppercase leading-[1.05] hover:text-[#d9182b]"
            >
              El estudio
            </a>
            <a
              routerLink="/cart"
              routerLinkActive="outline outline-2 outline-white"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="mt-12 flex min-h-14 items-center justify-between bg-[#d9182b] px-5 font-semibold text-white"
            >
              Ver carrito
              <span>{{ cartService.totalItems() }} prendas</span>
            </a>
          </div>
        </div>
      }
    </header>
  `,
})
export class HeaderComponent {
  cartService = inject(CartService);
  wishlistService = inject(WishlistService);
  mobileMenuOpen = signal(false);

  favoritesLabel = computed(() => {
    const count = this.wishlistService.totalItems();
    return count === 0 ? 'Favoritas' : `Favoritas, ${count} ${count === 1 ? 'guardada' : 'guardadas'}`;
  });
  badgeAnimating = signal(false);

  private document = inject(DOCUMENT);
  private injector = inject(Injector);
  private menuToggle = viewChild.required<ElementRef<HTMLButtonElement>>('menuToggle');
  private mobileNavigation = viewChild<ElementRef<HTMLElement>>('mobileNavigation');
  private previousCount = this.cartService.totalItems();
  private animationTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const open = this.mobileMenuOpen();
      this.document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        afterNextRender(() => this.menuLinks()[0]?.focus(), { injector: this.injector });
      }
    });

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
    this.mobileMenuOpen.update((open) => !open);
  }

  // El menú es solo mobile: si la ventana crece, se cierra para no dejar el scroll bloqueado.
  onResize(): void {
    if (this.mobileMenuOpen() && window.innerWidth >= 768) {
      this.closeMenu();
    }
  }

  onEscape(): void {
    if (this.mobileMenuOpen()) {
      this.closeMenu();
      this.menuToggle().nativeElement.focus();
    }
  }

  // Mantiene el foco entre el botón "Cerrar" y los enlaces mientras el menú tapa la página.
  trapFocus(event: Event): void {
    if (!this.mobileMenuOpen()) {
      return;
    }
    const focusables = [this.menuToggle().nativeElement, ...this.menuLinks()];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = this.document.activeElement;
    const backwards = (event as KeyboardEvent).shiftKey;

    if (backwards && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!backwards && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private menuLinks(): HTMLElement[] {
    const menu = this.mobileNavigation()?.nativeElement;
    return menu ? Array.from(menu.querySelectorAll<HTMLElement>('a')) : [];
  }
}
