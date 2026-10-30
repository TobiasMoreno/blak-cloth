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
      class="sticky top-0 z-50 bg-bone text-ink"
      (keydown.tab)="trapFocus($event)"
      (keydown.shift.tab)="trapFocus($event)"
    >
      <nav
        class="flex min-h-16 items-center justify-between px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:px-8"
        aria-label="Navegación principal"
      >
        <a
          routerLink="/"
          class="flex min-h-11 items-center transition-opacity duration-200 hover:opacity-70 md:justify-self-start"
          aria-label="BLAK, inicio"
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

        <div class="hidden items-center gap-6 md:flex md:justify-self-center">
          <a
            routerLink="/"
            routerLinkActive="text-accent"
            ariaCurrentWhenActive="page"
            [routerLinkActiveOptions]="{ exact: true }"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-accent"
          >
            Inicio
          </a>
          <a
            routerLink="/products"
            routerLinkActive="text-accent"
            ariaCurrentWhenActive="page"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-accent"
          >
            Colección
          </a>
          <a
            routerLink="/equipos"
            routerLinkActive="text-accent"
            ariaCurrentWhenActive="page"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-accent"
          >
            Para equipos
          </a>
          <a
            routerLink="/mayoristas"
            routerLinkActive="text-accent"
            ariaCurrentWhenActive="page"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-accent"
          >
            Mayoristas
          </a>
          <a
            routerLink="/about"
            routerLinkActive="text-accent"
            ariaCurrentWhenActive="page"
            class="min-h-11 content-center text-sm font-semibold transition-colors duration-200 hover:text-accent"
          >
            El estudio
          </a>
        </div>

        <div class="hidden items-center gap-2 md:flex md:justify-self-end">
          <a
            routerLink="/products"
            [queryParams]="{ favoritas: 1 }"
            [attr.aria-label]="favoritesLabel()"
            class="flex min-h-11 items-center justify-center gap-2 px-2 text-sm font-semibold transition-colors duration-200 hover:text-accent"
          >
            <i
              [class]="wishlistService.totalItems() > 0 ? 'pi pi-heart-fill text-accent' : 'pi pi-heart'"
              aria-hidden="true"
            ></i>
            Favoritas
            @if (wishlistService.totalItems() > 0) {
              <span class="tabular-nums" aria-hidden="true">{{ wishlistService.totalItems() }}</span>
            }
          </a>
          <a
            routerLink="/cart"
            routerLinkActive="bg-accent"
            ariaCurrentWhenActive="page"
            class="relative flex min-h-11 items-center gap-2 bg-ink px-4 text-sm font-semibold text-bone transition-colors duration-200 hover:bg-accent"
            [attr.aria-label]="cartLabel()"
          >
            Carrito
            @if (cartService.totalItems() > 0) {
              <span
                [class.cart-badge-pop]="badgeAnimating()"
                class="inline-flex min-h-6 min-w-6 items-center justify-center bg-accent px-1 text-xs text-white"
                aria-hidden="true"
              >
                {{ cartService.totalItems() }}
              </span>
            }
          </a>
        </div>

        <div class="flex items-center gap-1 md:hidden">
          <a
            routerLink="/products"
            [queryParams]="{ favoritas: 1 }"
            [attr.aria-label]="favoritesLabel()"
            (click)="closeMenu()"
            class="flex min-h-11 min-w-11 items-center justify-center gap-1 font-semibold"
          >
            <i
              [class]="wishlistService.totalItems() > 0 ? 'pi pi-heart-fill text-accent' : 'pi pi-heart'"
              aria-hidden="true"
            ></i>
            @if (wishlistService.totalItems() > 0) {
              <span class="text-sm tabular-nums" aria-hidden="true">{{ wishlistService.totalItems() }}</span>
            }
          </a>
          <!-- Siempre a mano en el teléfono: después de agregar una remera, el carrito está a un toque -->
          <a
            routerLink="/cart"
            ariaCurrentWhenActive="page"
            (click)="closeMenu()"
            [attr.aria-label]="cartLabel()"
            class="flex min-h-11 min-w-11 items-center justify-center gap-1.5 bg-ink px-3 text-sm font-semibold text-bone"
          >
            <!-- En 320px no entra la palabra junto al logo: queda el ícono -->
            <i class="pi pi-shopping-bag min-[380px]:hidden" aria-hidden="true"></i>
            <span class="max-[379px]:hidden">Carrito</span>
            @if (cartService.totalItems() > 0) {
              <span
                [class.cart-badge-pop]="badgeAnimating()"
                class="inline-flex min-h-6 min-w-6 items-center justify-center bg-accent px-1 text-xs tabular-nums text-white"
                aria-hidden="true"
              >
                {{ cartService.totalItems() }}
              </span>
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
          class="fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-ink px-4 py-10 text-bone md:hidden"
        >
          <div class="flex flex-col">
            <a
              routerLink="/"
              routerLinkActive="text-accent"
              [routerLinkActiveOptions]="{ exact: true }"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="flex min-h-16 items-center font-display text-6xl font-black leading-[1.05] hover:text-accent"
            >
              Inicio
            </a>
            <a
              routerLink="/products"
              routerLinkActive="text-accent"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="flex min-h-16 items-center font-display text-6xl font-black leading-[1.05] hover:text-accent"
            >
              Colección
            </a>
            <a
              routerLink="/equipos"
              routerLinkActive="text-accent"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="flex min-h-16 items-center font-display text-6xl font-black leading-[1.05] hover:text-accent"
            >
              Para equipos
            </a>
            <a
              routerLink="/mayoristas"
              routerLinkActive="text-accent"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="flex min-h-16 items-center font-display text-6xl font-black leading-[1.05] hover:text-accent"
            >
              Mayoristas
            </a>
            <a
              routerLink="/about"
              routerLinkActive="text-accent"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="flex min-h-16 items-center font-display text-6xl font-black leading-[1.05] hover:text-accent"
            >
              El estudio
            </a>
            <a
              routerLink="/cart"
              routerLinkActive="outline outline-2 outline-white"
              ariaCurrentWhenActive="page"
              (click)="closeMenu()"
              class="mt-12 flex min-h-14 items-center justify-between bg-accent px-5 font-semibold text-white"
            >
              Ver carrito
              <span>{{ itemsLabel() }}</span>
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
  itemsLabel = computed(() => {
    const count = this.cartService.totalItems();
    return `${count} ${count === 1 ? 'prenda' : 'prendas'}`;
  });
  // Empieza con el texto visible ("Carrito") para que el control por voz lo encuentre
  cartLabel = computed(() => (this.cartService.totalItems() === 0 ? 'Carrito, vacío' : `Carrito, ${this.itemsLabel()}`));
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
