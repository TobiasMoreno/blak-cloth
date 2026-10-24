import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService, ProductFilters } from './product.service';

const CATALOG = [
  {
    slug: 'medusa',
    name: 'Medusa',
    collection: 'minimal',
    price: 30000,
    createdAt: '2026-10-22',
    featured: true,
    description: 'Negra',
    images: { mockup: 'products/medusa/mockup.jpeg' },
    variants: [
      { size: 'M', color: 'Negro', available: true },
      { size: 'L', color: 'Negro', available: false }
    ]
  },
  {
    slug: 'stitch-art',
    name: 'Stitch Art',
    collection: 'anime',
    price: 25000,
    description: 'Anime',
    images: { front: 'products/stitch-art/front.webp', back: 'products/stitch-art/back.webp' },
    variants: [{ size: 'XL', color: 'Blanco', available: true }]
  },
  { slug: 'sin-fotos', name: 'Sin fotos', price: 1000, images: {}, variants: [] },
  { name: 'Sin slug', price: 1000 }
];

const NO_FILTERS: ProductFilters = {
  search: '',
  collection: null,
  sizes: [],
  colors: [],
  minPrice: null,
  maxPrice: null,
  sort: 'nuevos'
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ProductService);
    service.products();
    TestBed.tick();

    const http = TestBed.inject(HttpTestingController);
    http.expectOne('data/products.json').flush(CATALOG);
    http.expectOne('data/collections.json').flush({
      items: [
        { name: 'Minimal', slug: 'minimal' },
        { name: 'Anime', slug: 'anime' },
        { name: 'Vacía', slug: 'vacia' }
      ]
    });
    await TestBed.inject(ApplicationRef).whenStable();
  });

  it('descarta las remeras incompletas o sin fotos', () => {
    expect(service.products().map(p => p.id)).toEqual(['medusa', 'stitch-art']);
  });

  it('solo cuenta talles disponibles y muestra la espalda al pasar el mouse si hay frente y espalda', () => {
    const [medusa, stitch] = service.products();
    expect(medusa.sizes).toEqual(['M']);
    expect(medusa.hoverImage).toBeNull();
    expect(stitch.images).toEqual(['products/stitch-art/front.webp', 'products/stitch-art/back.webp']);
    expect(stitch.hoverImage).toBe('products/stitch-art/back.webp');
  });

  it('oculta las colecciones sin remeras', () => {
    expect(service.collections().map(c => c.slug)).toEqual(['minimal', 'anime']);
  });

  it('filtra por colección y ordena por precio', () => {
    expect(service.getProductsByFilters({ ...NO_FILTERS, collection: 'anime' }).map(p => p.id)).toEqual(['stitch-art']);
    expect(service.getProductsByFilters({ ...NO_FILTERS, sort: 'precio-asc' }).map(p => p.id)).toEqual([
      'stitch-art',
      'medusa'
    ]);
  });

  it('encuentra remeras por los IDs numéricos viejos', () => {
    expect(service.getProductById('006')?.id).toBe('medusa');
  });
});
