import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { WishlistService } from '../../core/services/wishlist.service';
import { FormsModule } from '@angular/forms';
import { ProductService, ProductSort } from '../../core/services/product.service';
import { getColorHex } from '../../core/constants/colors.constants';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

const PAGE_SIZE = 12;
const FILTERS_SYNC_STATE = 'filtersSync';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'nuevos', label: 'Más nuevas' },
  { value: 'precio-asc', label: 'Menor precio' },
  { value: 'precio-desc', label: 'Mayor precio' },
  { value: 'nombre', label: 'Nombre A-Z' }
];

@Component({
  selector: 'app-products',
  imports: [ProductCardComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'products.component.html'
})
export class ProductsComponent {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  private wishlistService = inject(WishlistService);

  readonly sortOptions = SORT_OPTIONS;
  readonly getColorHex = getColorHex;

  // Los filtros viven en la URL (ver constructor): se pueden compartir y sobreviven al botón "atrás"
  searchTerm = signal('');
  selectedCollection = signal<string | null>(null);
  onlyFavorites = signal(false);
  selectedSizes = signal<string[]>([], { equal: sameItems });
  selectedColors = signal<string[]>([], { equal: sameItems });
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);
  sort = signal<ProductSort>('nuevos');
  filtersOpen = signal(false);

  favoritesCount = this.wishlistService.totalItems;
  showCollectionBar = computed(() =>
    this.collections().length > 0 || this.favoritesCount() > 0 || this.onlyFavorites()
  );

  isLoading = this.productService.isLoading;
  collections = this.productService.collections;
  availableSizes = this.productService.allSizes;
  availableColors = this.productService.allColors;

  // Un filtro solo aparece si tiene algo que elegir
  showSizeFilter = computed(() => this.availableSizes().length > 1);
  showColorFilter = computed(() => this.availableColors().length > 1);
  showPriceFilter = computed(() => {
    const range = this.productService.priceRange();
    return range !== null && range.min !== range.max;
  });
  hasFilterPanel = computed(() => this.showSizeFilter() || this.showColorFilter() || this.showPriceFilter());

  activeFilterCount = computed(() =>
    this.selectedSizes().length +
    this.selectedColors().length +
    (this.minPrice() !== null || this.maxPrice() !== null ? 1 : 0)
  );

  hasActiveFilters = computed(() =>
    this.activeFilterCount() > 0 ||
    this.searchTerm().trim() !== '' ||
    this.selectedCollection() !== null ||
    this.onlyFavorites()
  );

  filteredProducts = computed(() => {
    const products = this.productService.getProductsByFilters({
      search: this.searchTerm(),
      collection: this.selectedCollection(),
      sizes: this.selectedSizes(),
      colors: this.selectedColors(),
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      sort: this.sort()
    });
    if (!this.onlyFavorites()) return products;
    const favorites = this.wishlistService.ids();
    return products.filter(product => favorites.includes(product.id));
  });

  // Vuelve a la primera página cada vez que cambian los resultados
  visibleCount = linkedSignal({ source: this.filteredProducts, computation: () => PAGE_SIZE });
  visibleProducts = computed(() => this.filteredProducts().slice(0, this.visibleCount()));
  remainingCount = computed(() => Math.max(0, this.filteredProducts().length - this.visibleCount()));

  constructor() {
    // URL → filtros. Se escucha siempre (no solo al entrar) porque el corazón del encabezado
    // navega a /products?favoritas=1 aunque ya estemos en esta página
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => {
      // Ignorar las navegaciones que hace este mismo componente: si llegaran tarde
      // (p. ej. mientras se tipea en el buscador) pisarían lo último que se escribió
      if (this.router.currentNavigation()?.extras.state?.[FILTERS_SYNC_STATE]) return;
      this.searchTerm.set(params.get('q') ?? '');
      this.selectedCollection.set(params.get('coleccion'));
      this.onlyFavorites.set(params.get('favoritas') === '1');
      this.selectedSizes.set(splitParam(params.get('talle')));
      this.selectedColors.set(splitParam(params.get('color')));
      this.minPrice.set(toNumber(params.get('min')));
      this.maxPrice.set(toNumber(params.get('max')));
      this.sort.set(toSort(params.get('orden')));
    });

    // Filtros → URL
    effect(() => {
      const queryParams = {
        q: this.searchTerm().trim() || null,
        coleccion: this.selectedCollection(),
        favoritas: this.onlyFavorites() ? 1 : null,
        talle: this.selectedSizes().join(',') || null,
        color: this.selectedColors().join(',') || null,
        min: this.minPrice(),
        max: this.maxPrice(),
        orden: this.sort() === 'nuevos' ? null : this.sort()
      };
      untracked(() =>
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams,
          replaceUrl: true,
          state: { [FILTERS_SYNC_STATE]: true }
        })
      );
    });
  }

  // Colecciones y favoritas funcionan como pestañas: se elige una sola vista a la vez
  selectCollection(slug: string | null): void {
    this.selectedCollection.set(slug);
    this.onlyFavorites.set(false);
  }

  showFavorites(): void {
    this.selectedCollection.set(null);
    this.onlyFavorites.set(true);
  }

  toggleSize(size: string): void {
    this.selectedSizes.update(current =>
      current.includes(size) ? current.filter(s => s !== size) : [...current, size]
    );
  }

  toggleColor(color: string): void {
    this.selectedColors.update(current =>
      current.includes(color) ? current.filter(c => c !== color) : [...current, color]
    );
  }

  setMinPrice(value: number | string | null): void {
    this.minPrice.set(toNumber(value));
  }

  setMaxPrice(value: number | string | null): void {
    this.maxPrice.set(toNumber(value));
  }

  setSort(value: string): void {
    this.sort.set(toSort(value));
  }

  showMore(): void {
    const firstNewIndex = this.visibleCount();
    this.visibleCount.update(count => count + PAGE_SIZE);
    // Llevar el foco a la primera remera nueva para quien navega con teclado o lector de pantalla
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>(`[data-index="${firstNewIndex}"] a`)?.focus(),
      { injector: this.injector }
    );
  }

  clearAllFilters(): void {
    this.searchTerm.set('');
    this.selectedCollection.set(null);
    this.onlyFavorites.set(false);
    this.selectedSizes.set([]);
    this.selectedColors.set([]);
    this.minPrice.set(null);
    this.maxPrice.set(null);
  }
}

function sameItems(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function splitParam(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : [];
}

function toNumber(value: number | string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSort(value: string | null): ProductSort {
  return SORT_OPTIONS.find(option => option.value === value)?.value ?? 'nuevos';
}
