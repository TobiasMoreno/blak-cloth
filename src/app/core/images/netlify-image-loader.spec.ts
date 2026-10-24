import * as angularCore from '@angular/core';
import { netlifyImageLoader } from './netlify-image-loader';

vi.mock('@angular/core', async importOriginal => ({
  ...(await importOriginal<typeof angularCore>()),
  isDevMode: vi.fn(() => false)
}));

describe('netlifyImageLoader', () => {
  it('pide la imagen al Image CDN con el ancho solicitado', () => {
    expect(netlifyImageLoader({ src: 'products/medusa/mockup.jpeg', width: 640 })).toBe(
      '/.netlify/images?url=%2Fproducts%2Fmedusa%2Fmockup.jpeg&w=640&q=75'
    );
  });

  it('deja intactas las URLs externas', () => {
    expect(netlifyImageLoader({ src: 'https://example.com/a.jpg', width: 640 })).toBe('https://example.com/a.jpg');
  });

  it('usa el archivo original en desarrollo', () => {
    vi.mocked(angularCore.isDevMode).mockReturnValueOnce(true);
    expect(netlifyImageLoader({ src: 'products/medusa/mockup.jpeg', width: 640 })).toBe('products/medusa/mockup.jpeg');
  });
});
