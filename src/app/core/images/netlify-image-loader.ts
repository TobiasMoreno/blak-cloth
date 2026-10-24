import { isDevMode } from '@angular/core';
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';

/**
 * En producción las fotos pasan por el Image CDN de Netlify: genera el ancho que pide cada pantalla
 * y entrega WebP/AVIF según el navegador. En `ng serve` ese servicio no existe, así que se usa el archivo original.
 * Los SVG (logo) son vectoriales: se sirven tal cual.
 */
export function netlifyImageLoader(config: ImageLoaderConfig): string {
  const path = '/' + config.src.replace(/^\//, '');
  if (isDevMode() || /^https?:/.test(config.src) || /\.svg$/i.test(config.src)) {
    return config.src;
  }
  const width = config.width ? `&w=${config.width}` : '';
  return `/.netlify/images?url=${encodeURIComponent(path)}${width}&q=75`;
}

export const provideNetlifyImageLoader = () => ({ provide: IMAGE_LOADER, useValue: netlifyImageLoader });
