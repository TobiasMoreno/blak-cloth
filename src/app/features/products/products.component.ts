import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { ProductService } from '../../core/services/product.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-products',
  imports: [ProductCardComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: 'products.component.html'
})
export class ProductsComponent {
  private productService = inject(ProductService);

  searchTerm = signal<string>('');
  selectedSizes = signal<string[]>([]);
  selectedColors = signal<string[]>([]);
  minPrice = signal<number | null>(null);
  maxPrice = signal<number | null>(null);

  availableSizes = signal<string[]>(this.productService.getAllSizes());
  availableColors = signal<string[]>(this.productService.getAllColors());

  hasActiveFilters = computed(() => {
    return this.selectedSizes().length > 0 ||
           this.selectedColors().length > 0 ||
           this.minPrice() !== null ||
           this.maxPrice() !== null;
  });

  filteredProducts = computed(() => {
    return this.productService.getProductsByFilters(
      this.selectedSizes(),
      this.selectedColors(),
      this.searchTerm(),
      this.minPrice(),
      this.maxPrice()
    );
  });

  toggleSize(size: string): void {
    const current = this.selectedSizes();
    this.selectedSizes.set(
      current.includes(size) ? current.filter(s => s !== size) : [...current, size]
    );
  }

  toggleColor(color: string): void {
    const current = this.selectedColors();
    this.selectedColors.set(
      current.includes(color) ? current.filter(c => c !== color) : [...current, color]
    );
  }

  setMinPrice(value: number | string | null): void {
    this.minPrice.set(value === null || value === '' ? null : Number(value));
  }

  setMaxPrice(value: number | string | null): void {
    this.maxPrice.set(value === null || value === '' ? null : Number(value));
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

  clearSizesColors(): void {
    this.selectedSizes.set([]);
    this.selectedColors.set([]);
  }

  clearPriceFilter(): void {
    this.minPrice.set(null);
    this.maxPrice.set(null);
  }

  clearFilters(): void {
    this.clearSizesColors();
    this.clearPriceFilter();
  }

  clearAllFilters(): void {
    this.searchTerm.set('');
    this.clearSizesColors();
    this.clearPriceFilter();
  }

}
