// Genera versiones livianas de cada foto de products/ e images/ para Firebase Hosting, que no tiene
// un Image CDN como Netlify:
//   img/<ruta>-<ancho>.webp  → un archivo por ancho de IMAGE_WIDTHS (lo pide el loader de NgOptimizedImage)
//   img/<ruta>-share.jpg     → 1200×630, el formato que esperan WhatsApp y Facebook (og:image)
// Los originales no se tocan: siguen en el sitemap y en los datos estructurados.
// Corre solo después de `npm run build`, antes de build-static-pages.mjs.
import { readFileSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import sharp from 'sharp';

const DIST = 'dist/lm-studio/browser';
const SOURCE_DIRS = ['products', 'images'];
const RASTER_IMAGE = /\.(jpe?g|png|webp)$/i;

const constants = readFileSync('src/app/core/constants/image.constants.ts', 'utf8');
const IMAGE_WIDTHS = JSON.parse(constants.match(/IMAGE_WIDTHS\s*=\s*(\[[^\]]+\])/)[1]);
const OUTPUT_DIR = constants.match(/OPTIMIZED_IMAGE_DIR\s*=\s*'([^']+)'/)[1];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (RASTER_IMAGE.test(entry.name)) yield path;
  }
}

const sources = SOURCE_DIRS.flatMap((dir) => [...walk(join(DIST, dir))]);
let originalBytes = 0;
let webpBytes = 0;

await Promise.all(
  sources.map(async (file) => {
    const base = join(DIST, OUTPUT_DIR, relative(DIST, file)).replace(RASTER_IMAGE, '');
    mkdirSync(dirname(base), { recursive: true });
    const input = readFileSync(file);
    originalBytes += statSync(file).size;

    for (const width of IMAGE_WIDTHS) {
      // Si la foto es más chica que el ancho, se guarda en su tamaño: el archivo tiene que existir igual
      const info = await sharp(input)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 75, effort: 5 })
        .toFile(`${base}-${width}.webp`);
      if (width === 640) webpBytes += info.size;
    }

    await sharp(input)
      .rotate()
      .resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' })
      .flatten({ background: '#f4f4f0' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(`${base}-share.jpg`);
  })
);

const kb = (bytes) => Math.round(bytes / 1024) + ' KB';
console.log(
  `[imágenes] ${sources.length} fotos × ${IMAGE_WIDTHS.length} anchos en /${OUTPUT_DIR} ` +
    `(originales ${kb(originalBytes)} → WebP 640px ${kb(webpBytes)})`
);
