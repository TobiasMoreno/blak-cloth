// Junta public/products/<slug>/index.json (lo que edita Decap CMS) en public/data/products.json,
// que es el archivo que consume la web. Corre solo antes de `npm start` y `npm run build`.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PRODUCTS_DIR = 'public/products';
const OUTPUT = 'public/data/products.json';

const resolveImage = (slug, file) => (file ? `products/${slug}/${file.replace(/^\.?\//, '')}` : null);

const products = readdirSync(PRODUCTS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(PRODUCTS_DIR, entry.name, 'index.json')))
  .flatMap(({ name: slug }) => {
    try {
      const data = JSON.parse(readFileSync(join(PRODUCTS_DIR, slug, 'index.json'), 'utf8'));
      const images = Object.fromEntries(
        Object.entries(data.images ?? {}).map(([key, file]) => [key, resolveImage(slug, file)])
      );
      return [{ ...data, slug, images }];
    } catch (error) {
      console.warn(`[catálogo] Se omitió "${slug}": ${error.message}`);
      return [];
    }
  })
  .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || a.name.localeCompare(b.name));

mkdirSync('public/data', { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(products, null, 2) + '\n');
console.log(`[catálogo] ${products.length} remeras → ${OUTPUT}`);
