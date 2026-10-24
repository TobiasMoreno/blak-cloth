export type ProductSize = 'S' | 'M' | 'L' | 'XL';

export interface ProductVariant {
  size: ProductSize;
  color: string;
  available: boolean;
}

/** Forma de cada remera en public/data/products.json (generado desde Decap CMS). */
export interface CatalogEntry {
  slug: string;
  name: string;
  collection?: string;
  price: number;
  createdAt?: string;
  featured?: boolean;
  description: string;
  images: { front?: string | null; back?: string | null; mockup?: string | null };
  variants: ProductVariant[];
}

export interface Product {
  /** Es el slug: identifica la remera en la URL, el carrito y favoritos. */
  id: string;
  name: string;
  collection: string | null;
  price: number;
  createdAt: string | null;
  featured: boolean;
  images: string[];
  sizes: ProductSize[];
  colors: string[];
  variants: ProductVariant[];
  description: string;
}
