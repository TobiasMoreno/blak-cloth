import { Injectable, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { CatalogEntry, Product, ProductCollection, ProductSize } from '../models/product.model';
import { resolveLegacyProductId } from '../constants/legacy-products.constants';

const SIZE_ORDER: ProductSize[] = ['S', 'M', 'L', 'XL'];

export type ProductSort = 'nuevos' | 'precio-asc' | 'precio-desc' | 'nombre';

export interface ProductFilters {
  search: string;
  collection: string | null;
  sizes: string[];
  colors: string[];
  minPrice: number | null;
  maxPrice: number | null;
  sort: ProductSort;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private catalog = httpResource<unknown>(() => 'data/products.json', { defaultValue: [] });
  private collectionsFile = httpResource<{ items?: ProductCollection[] }>(() => 'data/collections.json', {
    defaultValue: {}
  });

  readonly isLoading = this.catalog.isLoading;
  readonly hasError = computed(() => this.catalog.error() !== undefined);

  readonly products = computed<Product[]>(() => {
    const entries = this.catalog.value();
    return Array.isArray(entries) ? entries.flatMap(toProduct) : [];
  });

  /** Solo las colecciones que tienen al menos una remera. */
  readonly collections = computed(() =>
    (this.collectionsFile.value().items ?? []).filter(collection =>
      this.products().some(product => product.collection === collection.slug)
    )
  );

  readonly allSizes = computed(() =>
    SIZE_ORDER.filter(size => this.products().some(product => product.sizes.includes(size)))
  );

  readonly allColors = computed(() =>
    [...new Set(this.products().flatMap(product => product.colors))].sort()
  );

  readonly priceRange = computed(() => {
    const prices = this.products().map(product => product.price);
    return prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
  });

  readonly featuredProducts = computed(() => {
    const featured = this.products().filter(product => product.featured);
    return featured.length > 0 ? featured : this.products().slice(0, 3);
  });

  getProductById(id: string): Product | undefined {
    const slug = resolveLegacyProductId(id);
    return this.products().find(product => product.id === slug);
  }

  getProductsByFilters(filters: ProductFilters): Product[] {
    let filtered = this.products();

    // Búsqueda por nombre
    if (filters.search.trim()) {
      const search = filters.search.toLowerCase().trim();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search)
      );
    }

    if (filters.collection) {
      filtered = filtered.filter(product => product.collection === filters.collection);
    }

    // Filtro por precio
    const { minPrice, maxPrice } = filters;
    if (minPrice !== null) {
      filtered = filtered.filter(product => product.price >= minPrice);
    }
    if (maxPrice !== null) {
      filtered = filtered.filter(product => product.price <= maxPrice);
    }

    // Filtro por talle
    if (filters.sizes.length > 0) {
      filtered = filtered.filter(product =>
        filters.sizes.some(size => product.sizes.includes(size as ProductSize))
      );
    }

    // Filtro por color
    if (filters.colors.length > 0) {
      filtered = filtered.filter(product =>
        filters.colors.some(color => product.colors.includes(color))
      );
    }

    return sortProducts(filtered, filters.sort);
  }

  getRelatedProducts(productId: string, limit = 4): Product[] {
    const current = this.getProductById(productId);
    const others = this.products().filter(p => p.id !== current?.id);
    const sameCollection = others.filter(p => current?.collection && p.collection === current.collection);
    return [...sameCollection, ...others.filter(p => !sameCollection.includes(p))].slice(0, limit);
  }
}

function sortProducts(products: Product[], sort: ProductSort): Product[] {
  switch (sort) {
    case 'precio-asc':
      return [...products].sort((a, b) => a.price - b.price);
    case 'precio-desc':
      return [...products].sort((a, b) => b.price - a.price);
    case 'nombre':
      return [...products].sort((a, b) => a.name.localeCompare(b.name));
    default:
      // products.json ya viene ordenado de más nuevo a más viejo
      return products;
  }
}

/** Convierte una entrada del JSON en Product; si viene incompleta la descarta para no romper el catálogo. */
function toProduct(raw: unknown): Product[] {
  const entry = raw as Partial<CatalogEntry> | null;
  if (!entry || typeof entry.slug !== 'string' || typeof entry.name !== 'string' || typeof entry.price !== 'number') {
    console.warn('[catálogo] Se omitió una remera con datos incompletos:', raw);
    return [];
  }

  const { front, back, mockup } = entry.images ?? {};
  const images = [front, back, mockup]
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
    hoverImage: front && back ? back : null,
    sizes: SIZE_ORDER.filter(size => available.some(variant => variant.size === size)),
    colors: [...new Set(available.map(variant => variant.color))],
    variants,
    description: entry.description ?? ''
  }];
}
