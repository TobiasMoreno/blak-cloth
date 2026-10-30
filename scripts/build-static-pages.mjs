// Genera el HTML estático de cada página pública a partir del index.html que arma Angular:
// título, descripción, canonical, Open Graph, datos estructurados (JSON-LD) y una versión en texto
// del contenido dentro de <app-root>. Buscadores y redes sociales leen eso sin ejecutar JavaScript;
// Angular lo reemplaza apenas arranca. También escribe robots.txt, sitemap.xml y 404.html.
// Corre solo después de `npm run build`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/lm-studio/browser';
const ON_NETLIFY = Boolean(process.env.NETLIFY);
// Netlify define URL con la dirección de ese sitio: solo se usa para las imágenes de su Image CDN
const DEPLOY_URL = (process.env.URL ?? '').replace(/\/$/, '');

const readSource = (path) => readFileSync(path, 'utf8');
const readConstant = (source, name) => source.match(new RegExp(`${name}\\s*=\\s*'([^']+)'`))?.[1];

const siteSource = readSource('src/app/core/constants/site.constants.ts');
const SITE_URL = readConstant(siteSource, 'SITE_URL').replace(/\/$/, '');
const SITE_NAME = readConstant(siteSource, 'SITE_NAME');
const BRAND_NAME = readConstant(siteSource, 'BRAND_NAME');
const WHATSAPP_URL = readConstant(readSource('src/app/core/constants/whatsapp.constants.ts'), 'WHATSAPP_BASE_URL');
const storeSource = readSource('src/app/core/constants/store-info.constants.ts');
const STORE_CITY = storeSource.match(/city:\s*'([^']+)'/)?.[1] ?? 'Córdoba';
const STORE_PAYMENT = storeSource.match(/payment:\s*'([^']+)'/)?.[1];
const LEGACY_IDS = [
  ...readSource('src/app/core/constants/legacy-products.constants.ts').matchAll(/'(\d+)':\s*'([a-z0-9-]+)'/g)
].map(([, id, slug]) => ({ id, slug }));

const SIZE_ORDER = ['S', 'M', 'L', 'XL'];
const MAX_DESCRIPTION_LENGTH = 160;

const template = readFileSync(join(DIST, 'index.html'), 'utf8');
const wholesaleTiers = JSON.parse(readFileSync(join(DIST, 'data/wholesale.json'), 'utf8')).tiers ?? [];

// Misma limpieza que ProductService: sin fotos la remera no se muestra en la web
const products = JSON.parse(readFileSync(join(DIST, 'data/products.json'), 'utf8'))
  .map((entry) => {
    const { front, back, mockup } = entry.images ?? {};
    const available = (entry.variants ?? []).filter((v) => SIZE_ORDER.includes(v.size) && v.available !== false);
    return {
      slug: entry.slug,
      name: entry.name,
      collection: entry.collection || null,
      price: entry.price,
      description: entry.description ?? '',
      images: [front, back, mockup].filter(Boolean),
      sizes: SIZE_ORDER.filter((size) => available.some((v) => v.size === size)),
      colors: [...new Set(available.map((v) => v.color))]
    };
  })
  .filter((product) => product.images.length > 0 && typeof product.price === 'number');

// ---------- Utilidades ----------

const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const absoluteUrl = (path) => SITE_URL + '/' + path.replace(/^\//, '');
const formatPrice = (price) => '$' + Math.round(price).toLocaleString('es-AR');

/** Imagen de 1200×630 (el formato que esperan WhatsApp y Facebook), recortada por el Image CDN de Netlify. */
function shareImage(path) {
  if (ON_NETLIFY && DEPLOY_URL) {
    const url = `${DEPLOY_URL}/.netlify/images?url=${encodeURIComponent('/' + path)}&w=1200&h=630&fit=cover&fm=jpg&q=80`;
    return { url, width: 1200, height: 630 };
  }
  // En Firebase va la foto original: no se conocen sus medidas, así que no se declaran
  return { url: absoluteUrl(path) };
}

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '') + '…';
}

function toSentence(text) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const capitalized = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

// Mismo texto que src/app/core/seo/product-seo.ts: si cambia uno, cambiar el otro
function productTitle(product) {
  const name = /^remera\b/i.test(product.name) ? product.name : `Remera ${product.name}`;
  return `${name} · ${SITE_NAME}`;
}

function productDescription(product) {
  const sizes = product.sizes.length > 0 ? `Talles ${product.sizes.join(', ')}` : 'Sin stock por ahora';
  const parts = [
    `Remera ${product.name} de ${BRAND_NAME}, diseño de autor.`,
    `${formatPrice(product.price)}. ${sizes}.`,
    toSentence(product.description),
    'Pedidos por WhatsApp, entrega en Córdoba.'
  ];
  return truncate(parts.filter(Boolean).join(' '), MAX_DESCRIPTION_LENGTH);
}

/** Igual que ProductService.getRelatedProducts: primero las de la misma colección. */
function relatedProducts(current, limit = 3) {
  const others = products.filter((p) => p.slug !== current.slug);
  const sameCollection = others.filter((p) => current.collection && p.collection === current.collection);
  return [...sameCollection, ...others.filter((p) => !sameCollection.includes(p))].slice(0, limit);
}

// ---------- Datos estructurados (schema.org) ----------

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

const organizationSchema = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: BRAND_NAME,
  alternateName: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: absoluteUrl('images/brand/blak-logo.jpg'),
  address: { '@type': 'PostalAddress', addressLocality: STORE_CITY, addressRegion: 'Córdoba', addressCountry: 'AR' },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    telephone: '+' + WHATSAPP_URL.replace(/\D/g, ''),
    url: WHATSAPP_URL,
    areaServed: 'AR',
    availableLanguage: 'es'
  }
};

const websiteSchema = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: SITE_NAME,
  inLanguage: 'es-AR',
  publisher: { '@id': ORGANIZATION_ID }
};

const breadcrumbSchema = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name,
    item: SITE_URL + path
  }))
});

function productSchema(product, url) {
  return {
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    description: toSentence(product.description) || productDescription(product),
    sku: product.slug,
    image: product.images.map(absoluteUrl),
    brand: { '@type': 'Brand', name: BRAND_NAME },
    category: 'Remeras',
    ...(product.colors.length === 1 ? { color: product.colors[0] } : {}),
    offers: {
      '@type': 'Offer',
      url,
      price: product.price,
      priceCurrency: 'ARS',
      availability: product.sizes.length > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': ORGANIZATION_ID }
    }
  };
}

const itemListSchema = (items) => ({
  '@type': 'ItemList',
  itemListElement: items.map((product, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: `${SITE_URL}/product/${product.slug}`,
    name: product.name
  }))
});

// ---------- Contenido rastreable dentro de <app-root> ----------

// Solo se ve hasta que arranca Angular: estilos mínimos con los colores y fuentes de la marca
const FALLBACK_STYLE = `<style>.seo-fallback{min-height:100svh;padding:2rem 1rem 4rem;background:#f4f4f0;color:#0b0b0b;font-family:"Public Sans","Helvetica Neue",sans-serif;line-height:1.5}.seo-fallback h1,.seo-fallback h2{font-family:"Big Shoulders","Arial Narrow",sans-serif;font-weight:900;text-transform:uppercase;line-height:.9}.seo-fallback h1{font-size:clamp(3rem,10vw,6rem);margin:2rem 0 1rem}.seo-fallback h2{font-size:2rem;margin:2.5rem 0 1rem}.seo-fallback a{color:inherit}.seo-fallback nav ul,.seo-fallback ol{display:flex;flex-wrap:wrap;gap:1rem;list-style:none;padding:0;margin:0}.seo-fallback img{display:block;width:100%;max-width:40rem;aspect-ratio:4/3;object-fit:cover;background:#e7e7e1}.seo-fallback p,.seo-fallback li{max-width:60ch}</style>`;

const NAV_LINKS = [
  ['/', 'Inicio'],
  ['/products', 'Colección'],
  ['/mayoristas', 'Mayoristas'],
  ['/about', 'El estudio']
];

const navHtml = `<nav aria-label="Principal"><ul>${NAV_LINKS.map(
  ([href, label]) => `<li><a href="${href}">${label}</a></li>`
).join('')}</ul></nav>`;

const productListHtml = (items) =>
  `<ul>${items
    .map(
      (p) =>
        `<li><a href="/product/${p.slug}">Remera ${escape(p.name)}</a> · ${formatPrice(p.price)} · ${
          p.sizes.length > 0 ? `Talles ${p.sizes.join(', ')}` : 'Sin stock'
        }</li>`
    )
    .join('')}</ul>`;

const fallback = (content) => `<div class="seo-fallback">${navHtml}<main>${content}</main></div>`;

// ---------- Render ----------

function renderPage({ title, description, path, noindex = false, image, imageAlt, ogType = 'website', schema = [], content = '' }) {
  const url = path === null ? null : SITE_URL + path;
  const share = image ? shareImage(image) : null;
  const tags = noindex
    ? ['  <meta name="robots" content="noindex">']
    : [
        `  <link rel="canonical" href="${escape(url)}">`,
        ...[
          ['og:site_name', SITE_NAME],
          ['og:type', ogType],
          ['og:title', title],
          ['og:description', description],
          ['og:url', url],
          ['og:locale', 'es_AR'],
          ...(share
            ? [
                ['og:image', share.url],
                ...(share.width ? [['og:image:width', share.width], ['og:image:height', share.height]] : []),
                ['og:image:alt', imageAlt]
              ]
            : [])
        ].map(([key, value]) => `  <meta property="${key}" content="${escape(value)}">`),
        '  <meta name="twitter:card" content="summary_large_image">'
      ];

  if (schema.length > 0) {
    // "<" escapado: un texto del CMS con "</script>" no puede cortar el bloque
    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': schema }).replace(/</g, '\\u003c');
    tags.push(`  <script type="application/ld+json">${json}</script>`);
  }

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escape(description)}">`)
    // Arriba de todo en el <head>: algunos lectores (WhatsApp) solo leen el comienzo del HTML
    .replace('<base href="/">', `<base href="/">\n${tags.join('\n')}`)
    .replace('</head>', content ? `${FALLBACK_STYLE}</head>` : '</head>')
    .replace(/<app-root>\s*<\/app-root>/, `<app-root>${content ? fallback(content) : ''}</app-root>`);
}

function writePage(file, html) {
  mkdirSync(join(DIST, file, '..'), { recursive: true });
  writeFileSync(join(DIST, file), html);
}

const cover = products[0];
const coverImage = cover?.images[0];
const homeTitle = template.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? SITE_NAME;
const homeDescription = template.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? '';

// Inicio
writePage(
  'index.html',
  renderPage({
    title: homeTitle,
    description: homeDescription,
    path: '/',
    image: coverImage,
    imageAlt: `Remeras ${SITE_NAME}`,
    schema: [organizationSchema, websiteSchema],
    content: `<h1>${BRAND_NAME}</h1><p>Remeras estampadas de autor, creadas en ${STORE_CITY}.</p>
<h2>El drop actual</h2>${productListHtml(products)}<p><a href="/products">Ver la colección completa</a></p>`
  })
);

// Colección. Los filtros (?talle=, ?color=, ?q=…) sirven este mismo archivo, con canonical a /products
writePage(
  'products.html',
  renderPage({
    title: 'Remeras estampadas de autor · Colección BLAK',
    description: `Todas las remeras estampadas de ${BRAND_NAME}: diseños de autor, ${products.length} modelos desde ${formatPrice(
      Math.min(...products.map((p) => p.price))
    )}. Elegí talle y color, y pedí por WhatsApp con entrega en Córdoba.`,
    path: '/products',
    image: coverImage,
    imageAlt: `Remeras ${SITE_NAME}`,
    schema: [itemListSchema(products), breadcrumbSchema([['Inicio', '/'], ['Colección', '/products']])],
    content: `<h1>Colección</h1><p>Diseños de autor · pedidos por WhatsApp</p>${productListHtml(products)}`
  })
);

// Una página por remera. Archivo plano (product/medusa.html), no carpeta con index.html: el hosting
// lo sirve en /product/medusa tal cual, mientras que a una carpeta le agrega "/" con un 301
for (const product of products) {
  const path = `/product/${product.slug}`;
  const related = relatedProducts(product);
  const facts = [
    `<p><strong>${formatPrice(product.price)}</strong></p>`,
    product.description && `<p>${escape(toSentence(product.description))}</p>`,
    `<p>${product.sizes.length > 0 ? `Talles disponibles: ${product.sizes.join(', ')}` : 'Por ahora no hay talles disponibles.'}</p>`,
    product.colors.length > 0 && `<p>Color: ${escape(product.colors.join(', '))}</p>`,
    STORE_PAYMENT && `<p>Pago: ${escape(STORE_PAYMENT)}, al confirmar por WhatsApp. Entrega: retiro o envío en ${escape(STORE_CITY)}, se coordina por WhatsApp.</p>`
  ].filter(Boolean);

  writePage(
    `product/${product.slug}.html`,
    renderPage({
      title: productTitle(product),
      description: productDescription(product),
      path,
      image: product.images[0],
      imageAlt: `Remera ${product.name}`,
      ogType: 'product',
      schema: [
        productSchema(product, SITE_URL + path),
        breadcrumbSchema([['Inicio', '/'], ['Colección', '/products'], [product.name, path]])
      ],
      content: `<nav aria-label="Breadcrumb"><ol><li><a href="/">Inicio</a></li><li><a href="/products">Colección</a></li><li aria-current="page">${escape(product.name)}</li></ol></nav>
<h1>${escape(product.name)}</h1><img src="/${product.images[0]}" alt="Remera ${escape(product.name)}" fetchpriority="high">${facts.join('')}
${related.length > 0 ? `<h2>También te puede gustar</h2>${productListHtml(related)}` : ''}`
    })
  );
}

// Mayoristas
const tierRows = wholesaleTiers
  .map((tier) => `<li>Desde ${tier.minQuantity} prendas: ${tier.discountPercent}% off en todo el pedido</li>`)
  .join('');
writePage(
  'mayoristas.html',
  renderPage({
    title: 'Remeras por mayor · Precios por cantidad · BLAK',
    description:
      wholesaleTiers.length > 0
        ? `Precios por cantidad para revendedores, tiendas y grupos: desde ${wholesaleTiers[0].minQuantity} prendas, ${wholesaleTiers[0].discountPercent}% off en todo el pedido. Remeras estampadas de autor de ${STORE_CITY}.`
        : `Precios por cantidad para revendedores, tiendas y grupos. Remeras estampadas de autor de ${STORE_CITY}.`,
    path: '/mayoristas',
    image: coverImage,
    imageAlt: `Remeras ${SITE_NAME}`,
    schema: [breadcrumbSchema([['Inicio', '/'], ['Mayoristas', '/mayoristas']])],
    content: `<h1>Precios por cantidad</h1><p>Para revendedores, tiendas o grupos que compran juntos. Cuantas más prendas lleves, menos pagás cada una.</p>${
      tierRows ? `<h2>Cuánto ahorrás</h2><ul>${tierRows}</ul>` : ''
    }<p><a href="/products">Armar el pedido</a></p>`
  })
);

// El estudio
writePage(
  'about.html',
  renderPage({
    title: 'El estudio · Streetwear de autor de Córdoba · BLAK',
    description: `${BRAND_NAME} es un proyecto independiente de ${STORE_CITY} que convierte gráfica, cultura urbana y obsesiones visuales en remeras de autor. Compra directa por WhatsApp.`,
    path: '/about',
    image: coverImage,
    imageAlt: `Remeras ${SITE_NAME}`,
    schema: [breadcrumbSchema([['Inicio', '/'], ['El estudio', '/about']])],
    content: `<h1>El estudio</h1><p>Un proyecto independiente de ${STORE_CITY} que convierte gráfica, cultura urbana y obsesiones visuales en prendas.</p>
<h2>La prenda es el soporte</h2><p>${BRAND_NAME} nace de la pasión por el arte, la gráfica y la cultura urbana. Cada remera empieza con una imagen que merece salir del papel.</p>`
  })
);

// Páginas sin valor en buscadores: Angular las arma igual, pero con noindex y sin canonical
writePage('cart.html', renderPage({ title: 'Carrito · BLAK', description: homeDescription, path: null, noindex: true }));
writePage('gestion.html', renderPage({ title: 'Gestión · BLAK', description: homeDescription, path: null, noindex: true }));
writePage('404.html', renderPage({ title: 'Página no encontrada · BLAK', description: homeDescription, path: null, noindex: true }));

// robots.txt y sitemap.xml (siempre con el dominio principal, aunque se publique en Netlify)
writeFileSync(
  join(DIST, 'robots.txt'),
  ['User-agent: *', 'Disallow: /gestion', 'Disallow: /admin/', '', `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n')
);

const sitemapEntry = (path, images = []) =>
  `  <url>\n    <loc>${escape(SITE_URL + path)}</loc>\n${images
    .map((image) => `    <image:image><image:loc>${escape(absoluteUrl(image))}</image:loc></image:image>\n`)
    .join('')}  </url>`;
writeFileSync(
  join(DIST, 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    sitemapEntry('/'),
    sitemapEntry('/products'),
    ...products.map((product) => sitemapEntry(`/product/${product.slug}`, product.images)),
    sitemapEntry('/mayoristas'),
    sitemapEntry('/about'),
    '</urlset>',
    ''
  ].join('\n')
);

// Netlify: links viejos con ID numérico → URL nueva (misma tabla que usa la app) y rutas internas de gestión.
// En Firebase lo mismo está en firebase.json; se avisa si falta alguno
const firebaseConfig = readSource('firebase.json');
for (const { id } of LEGACY_IDS) {
  if (!firebaseConfig.includes(`"/product/${id}"`)) {
    console.warn(`[estáticas] Falta la redirección de /product/${id} en firebase.json`);
  }
}
writeFileSync(
  join(DIST, '_redirects'),
  [...LEGACY_IDS.map(({ id, slug }) => `/product/${id}  /product/${slug}  301`), '/gestion/*  /gestion.html  200', ''].join('\n')
);

console.log(`[estáticas] ${products.length} remeras + 4 páginas, robots.txt y sitemap.xml (${SITE_URL})`);
