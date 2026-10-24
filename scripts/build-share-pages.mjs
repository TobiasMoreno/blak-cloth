// Genera un index.html por remera con etiquetas Open Graph, para que WhatsApp, Instagram, etc.
// muestren nombre, precio y foto al compartir un link. Esos servicios no ejecutan JavaScript,
// así que las etiquetas tienen que estar en el HTML. Corre solo después de `npm run build`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/lm-studio/browser';
// Netlify define URL con la dirección del sitio durante el build
const SITE_URL = (process.env.URL ?? 'http://localhost:4200').replace(/\/$/, '');
const ON_NETLIFY = Boolean(process.env.NETLIFY);
const SITE_NAME = 'BLAK CLOTH';

const template = readFileSync(join(DIST, 'index.html'), 'utf8');
const products = JSON.parse(readFileSync(join(DIST, 'data/products.json'), 'utf8'));

const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatPrice = (price) => '$' + price.toLocaleString('es-AR');

/** Imagen de 1200×630 (el formato que esperan WhatsApp y Facebook), recortada por el Image CDN de Netlify. */
function shareImageUrl(path) {
  const absolutePath = '/' + path.replace(/^\//, '');
  return ON_NETLIFY
    ? `${SITE_URL}/.netlify/images?url=${encodeURIComponent(absolutePath)}&w=1200&h=630&fit=cover&fm=jpg&q=80`
    : SITE_URL + absolutePath;
}

function renderPage({ title, description, url, image, imageAlt, type }) {
  const tags = [
    ['property', 'og:site_name', SITE_NAME],
    ['property', 'og:type', type],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', url],
    ['property', 'og:locale', 'es_AR'],
    ['property', 'og:image', image],
    ['property', 'og:image:width', '1200'],
    ['property', 'og:image:height', '630'],
    ['property', 'og:image:alt', imageAlt],
    ['name', 'twitter:card', 'summary_large_image']
  ]
    .map(([attr, key, value]) => `  <meta ${attr}="${key}" content="${escape(value)}">`)
    .join('\n');

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escape(description)}">`)
    // Arriba de todo en el <head>: algunos lectores (WhatsApp) solo leen el comienzo del HTML
    .replace('<base href="/">', `<base href="/">\n  <link rel="canonical" href="${escape(url)}">\n${tags}`);
}

// Páginas de cada remera
const redirects = [];
for (const product of products) {
  const image = product.images.front ?? product.images.mockup ?? product.images.back;
  if (!image) continue;

  const sizes = [...new Set(product.variants.filter((v) => v.available !== false).map((v) => v.size))];
  const details = [formatPrice(product.price), sizes.length > 0 ? `Talles ${sizes.join(' · ')}` : 'Sin stock'].join(' · ');
  const path = `/product/${product.slug}`;

  const html = renderPage({
    title: `${product.name} · ${SITE_NAME}`,
    description: [details, product.description].filter(Boolean).join(' — '),
    url: SITE_URL + path,
    image: shareImageUrl(image),
    imageAlt: `Remera ${product.name}`,
    type: 'product'
  });

  // Archivo plano (product/medusa.html), no carpeta con index.html: Netlify lo sirve en /product/medusa
  // tal cual, mientras que a una carpeta le agrega "/" con un 301 que confunde a WhatsApp y Facebook
  mkdirSync(join(DIST, 'product'), { recursive: true });
  writeFileSync(join(DIST, `${path}.html`), html);
}

// Links viejos con ID numérico → URL nueva (misma tabla que usa la app)
const legacySource = readFileSync('src/app/core/constants/legacy-products.constants.ts', 'utf8');
for (const [, id, slug] of legacySource.matchAll(/'(\d+)':\s*'([a-z0-9-]+)'/g)) {
  redirects.push(`/product/${id}  /product/${slug}  301`);
}

// Página principal y resto del sitio: vista previa general con la primera remera destacada
const cover = products.find((product) => product.featured) ?? products[0];
const coverImage = cover && (cover.images.front ?? cover.images.mockup);
const defaultDescription = template.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '';
writeFileSync(
  join(DIST, 'index.html'),
  renderPage({
    title: template.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? SITE_NAME,
    description: defaultDescription,
    url: SITE_URL + '/',
    image: coverImage ? shareImageUrl(coverImage) : '',
    imageAlt: `Remeras ${SITE_NAME}`,
    type: 'website'
  })
);

writeFileSync(join(DIST, '_redirects'), redirects.join('\n') + '\n');
console.log(`[compartir] ${products.length} páginas de remera con vista previa (${SITE_URL})`);
