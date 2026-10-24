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
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, ProductSort } from '../../core/services/product.service';
import { getColorHex } from '../../core/constants/colors.constants';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

const PAGE_SIZE = 12;

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

  // El estado inicial sale de la URL, así los filtros se pueden compartir y sobreviven al botón "atrás"
  private initialParams = this.route.snapshot.queryParamMap;

  readonly sortOptions = SORT_OPTIONS;
  readonly getColorHex = getColorHex;

  searchTerm = signal(this.initialParams.get('q') ?? '');
  selectedCollection = signal<string | null>(this.initialParams.get('coleccion'));
  selectedSizes = signal<string[]>(splitParam(this.initialParams.get('talle')));
  selectedColors = signal<string[]>(splitParam(this.initialParams.get('color')));
  minPrice = signal<number | null>(toNumber(this.initialParams.get('min')));
  maxPrice = signal<number | null>(toNumber(this.initialParams.get('max')));
  sort = signal<ProductSort>(toSort(this.initialParams.get('orden')));
  filtersOpen = signal(false);

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
    this.activeFilterCount() > 0 || this.searchTerm().trim() !== '' || this.selectedCollection() !== null
  );

  filteredProducts = computed(() =>
    this.productService.getProductsByFilters({
      search: this.searchTerm(),
      collection: this.selectedCollection(),
      sizes: this.selectedSizes(),
      colors: this.selectedColors(),
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      sort: this.sort()
    })
  );

  // Vuelve a la primera página cada vez que cambian los resultados
  visibleCount = linkedSignal({ source: this.filteredProducts, computation: () => PAGE_SIZE });
  visibleProducts = computed(() => this.filteredProducts().slice(0, this.visibleCount()));
  remainingCount = computed(() => Math.max(0, this.filteredProducts().length - this.visibleCount()));

  constructor() {
    effect(() => {
      const queryParams = {
        q: this.searchTerm().trim() || null,
        coleccion: this.selectedCollection(),
        talle: this.selectedSizes().join(',') || null,
        color: this.selectedColors().join(',') || null,
        min: this.minPrice(),
        max: this.maxPrice(),
        orden: this.sort() === 'nuevos' ? null : this.sort()
      };
      untracked(() => this.router.navigate([], { relativeTo: this.route, queryParams, replaceUrl: true }));
    });
  }

  selectCollection(slug: string | null): void {
    this.selectedCollection.set(slug);
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
    this.selectedSizes.set([]);
    this.selectedColors.set([]);
    this.minPrice.set(null);
    this.maxPrice.set(null);
  }
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
