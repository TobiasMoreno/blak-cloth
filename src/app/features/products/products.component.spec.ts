import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ProductsComponent } from './products.component';
import { WishlistService } from '../../core/services/wishlist.service';

const CATALOG = ['medusa', 'stitch-art', 'take-control'].map(slug => ({
  slug,
  name: slug,
  price: 30000,
  description: '',
  images: { mockup: `products/${slug}/mockup.jpeg` },
  variants: [{ size: 'M', color: 'Negro', available: true }]
}));

describe('ProductsComponent', () => {
  let harness: RouterTestingHarness;
  let router: Router;

  async function open(url: string) {
    const component = await harness.navigateByUrl(url, ProductsComponent);
    const http = TestBed.inject(HttpTestingController);
    http.match('data/products.json').forEach(request => request.flush(CATALOG));
    http.match('data/collections.json').forEach(request => request.flush({ items: [] }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    return component;
  }

  const visibleNames = () =>
    Array.from<HTMLElement>(harness.routeNativeElement!.querySelectorAll('app-product-card h3')).map(h =>
      h.textContent!.trim()
    );

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'products', component: ProductsComponent }]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    TestBed.inject(WishlistService).toggle('stitch-art');
    harness = await RouterTestingHarness.create();
    router = TestBed.inject(Router);
  });

  it('muestra solo las favoritas al entrar con ?favoritas=1', async () => {
    await open('/products?favoritas=1');
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain('Favoritas');
    expect(visibleNames()).toEqual(['stitch-art']);
  });

  it('reacciona al link del encabezado aunque ya esté en la colección', async () => {
    await open('/products');
    expect(visibleNames().length).toBe(3);

    await router.navigateByUrl('/products?favoritas=1');
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(visibleNames()).toEqual(['stitch-art']);
  });

  it('escribe los filtros en la URL sin pisar lo que se sigue tipeando', async () => {
    const component = await open('/products');

    component.searchTerm.set('t');
    component.searchTerm.set('ta');
    component.searchTerm.set('tak');
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(component.searchTerm()).toBe('tak');
    expect(router.url).toBe('/products?q=tak');
    expect(visibleNames()).toEqual(['take-control']);
  });
});
