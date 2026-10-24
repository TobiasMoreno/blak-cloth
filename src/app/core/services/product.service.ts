import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { CatalogEntry, Product, ProductSize } from '../models/product.model';

const SIZE_ORDER: ProductSize[] = ['S', 'M', 'L', 'XL'];

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private catalog = httpResource<unknown>(() => 'data/products.json', { defaultValue: [] });

  readonly isLoading = this.catalog.isLoading;
  readonly hasError = computed(() => this.catalog.error() !== undefined);

  readonly products = computed<Product[]>(() => {
    const entries = this.catalog.value();
    return Array.isArray(entries) ? entries.flatMap(toProduct) : [];
  });

  readonly allSizes = computed(() =>
    SIZE_ORDER.filter(size => this.products().some(product => product.sizes.includes(size)))
  );

  readonly allColors = computed(() =>
    [...new Set(this.products().flatMap(product => product.colors))].sort()
  );

  readonly featuredProducts = computed(() => {
    const featured = this.products().filter(product => product.featured);
    return featured.length > 0 ? featured : this.products().slice(0, 3);
  });

  getProductById(id: string): Product | undefined {
    return this.products().find(product => product.id === id);
  }

  getProductsByFilters(
    selectedSizes: string[] = [],
    selectedColors: string[] = [],
    searchTerm: string = '',
    minPrice: number | null = null,
    maxPrice: number | null = null
  ): Product[] {
    let filtered = this.products();

    // Búsqueda por nombre
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search)
      );
    }

    // Filtro por precio
    if (minPrice !== null) {
      filtered = filtered.filter(product => product.price >= minPrice);
    }
    if (maxPrice !== null) {
      filtered = filtered.filter(product => product.price <= maxPrice);
    }

    // Filtro por talle
    if (selectedSizes.length > 0) {
      filtered = filtered.filter(product =>
        selectedSizes.some(size => product.sizes.includes(size as ProductSize))
      );
    }

    // Filtro por color
    if (selectedColors.length > 0) {
      filtered = filtered.filter(product =>
        selectedColors.some(color => product.colors.includes(color))
      );
    }

    return filtered;
  }

  getRelatedProducts(productId: string, limit = 4): Product[] {
    const current = this.getProductById(productId);
    const others = this.products().filter(p => p.id !== productId);
    const sameCollection = others.filter(p => current?.collection && p.collection === current.collection);
    return [...sameCollection, ...others.filter(p => !sameCollection.includes(p))].slice(0, limit);
  }
}

/** Convierte una entrada del JSON en Product; si viene incompleta la descarta para no romper el catálogo. */
function toProduct(raw: unknown): Product[] {
  const entry = raw as Partial<CatalogEntry> | null;
  if (!entry || typeof entry.slug !== 'string' || typeof entry.name !== 'string' || typeof entry.price !== 'number') {
    console.warn('[catálogo] Se omitió una remera con datos incompletos:', raw);
    return [];
  }

  const images = [entry.images?.front, entry.images?.back, entry.images?.mockup]
    .filter((image): image is string => typeof image === 'string' && image.length > 0);
  if (images.length === 0) {
    console.warn(`[catálogo] Se omitió "${entry.slug}": no tiene fotos.`);
    return [];
  }

  const variants = (entry.variants ?? []).filter(
    variant => SIZE_ORDER.includes(variant.size) && typeof variant.color === 'string'
  );
  const available = variants.filter(variant => variant.available !== false);

  return [{
    id: entry.slug,
    name: entry.name,
    collection: entry.collection || null,
    price: entry.price,
    createdAt: entry.createdAt ?? null,
    featured: entry.featured === true,
    images,
    sizes: SIZE_ORDER.filter(size => available.some(variant => variant.size === size)),
    colors: [...new Set(available.map(variant => variant.color))],
    variants,
    description: entry.description ?? ''
  }];
}
