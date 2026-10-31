import * as angularCore from '@angular/core';
import { netlifyImageLoader, optimizedImagePath } from './netlify-image-loader';

vi.mock('@angular/core', async importOriginal => ({
  ...(await importOriginal<typeof angularCore>()),
  isDevMode: vi.fn(() => false)
}));

describe('netlifyImageLoader', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('en Netlify pide la imagen al Image CDN con el ancho solicitado', () => {
    vi.stubGlobal('location', { hostname: 'blakstreetwear.netlify.app' });
    expect(netlifyImageLoader({ src: 'products/medusa/mockup.jpeg', width: 640 })).toBe(
      '/.netlify/images?url=%2Fproducts%2Fmedusa%2Fmockup.jpeg&w=640&q=75'
    );
  });

  it('fuera de Netlify usa el WebP generado en el build', () => {
    vi.stubGlobal('location', { hostname: 'blakstreetwear.web.app' });
    expect(netlifyImageLoader({ src: 'products/medusa/mockup.jpeg', width: 640 })).toBe(
      '/img/products/medusa/mockup-640.webp'
    );
  });

  it('deja intactas las URLs externas', () => {
    expect(netlifyImageLoader({ src: 'https://example.com/a.jpg', width: 640 })).toBe('https://example.com/a.jpg');
  });

  it('sirve los SVG sin pasar por el CDN', () => {
    expect(netlifyImageLoader({ src: 'images/brand/blak-logo-black.svg', width: 640 })).toBe(
      'images/brand/blak-logo-black.svg'
    );
  });

  it('usa el archivo original en desarrollo', () => {
    vi.mocked(angularCore.isDevMode).mockReturnValueOnce(true);
    expect(netlifyImageLoader({ src: 'products/medusa/mockup.jpeg', width: 640 })).toBe('products/medusa/mockup.jpeg');
  });
});

describe('optimizedImagePath', () => {
  it('apunta al WebP del ancho generado que cubre el pedido', () => {
    expect(optimizedImagePath('products/medusa/mockup.jpeg', 500)).toBe('/img/products/medusa/mockup-640.webp');
    expect(optimizedImagePath('/products/the-rose-system/remera_dorso.png', 640)).toBe(
      '/img/products/the-rose-system/remera_dorso-640.webp'
    );
  });

  it('usa el ancho mayor si se pide más grande que todos', () => {
    expect(optimizedImagePath('products/medusa/mockup.jpeg', 2400)).toBe('/img/products/medusa/mockup-1920.webp');
  });

  it('sin ancho usa el ancho por defecto', () => {
    expect(optimizedImagePath('products/medusa/mockup.jpeg')).toBe('/img/products/medusa/mockup-1280.webp');
  });
});
