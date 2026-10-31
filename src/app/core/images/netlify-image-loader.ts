import { isDevMode } from '@angular/core';
import { IMAGE_CONFIG, IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';
import { DEFAULT_IMAGE_WIDTH, IMAGE_WIDTHS, OPTIMIZED_IMAGE_DIR } from '../constants/image.constants';

/**
 * En Netlify las fotos pasan por su Image CDN: genera el ancho que pide cada pantalla y entrega WebP/AVIF.
 * En Firebase Hosting ese servicio no existe, así que se usan los WebP que genera scripts/build-images.mjs
 * al compilar (un archivo por cada ancho de IMAGE_WIDTHS).
 * En `ng serve` no hay ninguno de los dos: va el archivo original. Los SVG (logo) se sirven tal cual.
 */
// Cualquier otro dominio (Firebase, un dominio propio, el emulador local) usa los WebP generados
const isNetlify = () => /\.netlify\.app$/i.test(globalThis.location?.hostname ?? '');

const RASTER_IMAGE = /\.(jpe?g|png|webp)$/i;

/** El menor ancho generado que cubre el pedido (o el mayor, si se pide más grande). */
function snapWidth(width: number): number {
  return IMAGE_WIDTHS.find((w) => w >= width) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
}

/** Ruta del WebP generado en el build, p. ej. `/img/products/medusa/mockup-640.webp`. */
export function optimizedImagePath(src: string, width = DEFAULT_IMAGE_WIDTH): string {
  const path = src.replace(/^\//, '').replace(RASTER_IMAGE, '');
  return `/${OPTIMIZED_IMAGE_DIR}/${path}-${snapWidth(width)}.webp`;
}

export function netlifyImageLoader(config: ImageLoaderConfig): string {
  if (isDevMode() || /^https?:/.test(config.src) || !RASTER_IMAGE.test(config.src)) {
    return config.src;
  }
  if (!isNetlify()) {
    return optimizedImagePath(config.src, config.width);
  }
  const path = '/' + config.src.replace(/^\//, '');
  const width = config.width ? `&w=${config.width}` : '';
  return `/.netlify/images?url=${encodeURIComponent(path)}${width}&q=75`;
}

export const provideNetlifyImageLoader = () => [
  { provide: IMAGE_LOADER, useValue: netlifyImageLoader },
  // El srcset pide solo los anchos que existen en Firebase
  { provide: IMAGE_CONFIG, useValue: { breakpoints: IMAGE_WIDTHS } }
];
