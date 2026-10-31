/**
 * Anchos en los que scripts/build-images.mjs genera cada foto en WebP, dentro de OPTIMIZED_IMAGE_DIR.
 * NgOptimizedImage usa estos mismos anchos para armar el srcset (IMAGE_CONFIG.breakpoints).
 * El script lee los dos valores de este archivo: si cambian acá, no hay que tocar nada más.
 */
export const IMAGE_WIDTHS = [384, 640, 960, 1280, 1920];
export const OPTIMIZED_IMAGE_DIR = 'img';
/** Ancho que va en el `src` cuando el navegador no usa el srcset. */
export const DEFAULT_IMAGE_WIDTH = 1280;
