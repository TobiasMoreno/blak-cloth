# Auditoría SEO · BLAK Streetwear

Fecha: 30/10/2026 · Alcance: repositorio `blak-cloth` (rama `main`, commit `b806c1d`) y sitio publicado.

> **Dominio:** el brief menciona `https://blak-streewear.web.app/`, pero esa dirección devuelve 404. El sitio real
> es **`https://blakstreetwear.web.app`** (Firebase Hosting, `firebase.json` → `site: blakstreetwear`, y es la URL
> que usa el workflow de deploy). Hay además una copia completa en `https://blakstreetwear.netlify.app`. Todo lo
> que sigue toma `blakstreetwear.web.app` como dominio principal (constante `SITE_URL` en
> `src/app/core/constants/site.constants.ts`).
>
> **Marca:** el brief dice "Blak Cloth"; el sitio, el logo y la pantalla de OAuth usan **BLAK** / **BLAK Streetwear**.
> Se respetó lo que ya está publicado. Si la marca pasa a ser "Blak Cloth", alcanza con cambiar `SITE_NAME`.

---

## 1. Resumen ejecutivo

BLAK es una SPA de Angular 21 renderizada solo en el navegador (CSR), con un catálogo chico (8 remeras) que se
edita en Decap CMS y se compila a `data/products.json`. Las páginas de producto ya tenían un HTML estático con Open
Graph (para WhatsApp), pero el resto del SEO técnico estaba roto en producción:

- `robots.txt` y `sitemap.xml` **no existían**: respondían 200 con el HTML de la app.
- **Cualquier URL respondía 200** (`/no-existe`, `/product/cualquier-cosa`): soft-404 en todo el sitio, y dentro de la
  app las URLs inválidas redirigían al inicio.
- **Contenido duplicado entre dominios**: el build de Netlify ponía canonical a `netlify.app` y el de Firebase a
  `web.app`; cada copia se declaraba original.
- Sin **datos estructurados** (Product, Offer, Organization, BreadcrumbList).
- El `<body>` del HTML era `<app-root></app-root>` vacío: ni H1, ni precio, ni enlaces entre productos sin ejecutar
  JavaScript.
- Las redirecciones de los links viejos (`/product/006`) solo existían para Netlify (`_redirects`), no en Firebase,
  que es donde está publicado el sitio.

Se implementó, sin migrar de tecnología ni sumar dependencias:

1. Un paso post-build (`scripts/build-static-pages.mjs`) que genera **HTML estático por página pública** con título,
   descripción, canonical al dominio principal, Open Graph, **JSON-LD** y una versión rastreable del contenido.
2. `robots.txt`, `sitemap.xml` (con imágenes) y `404.html` reales.
3. Hosting sin redirección comodín: **404 verdaderos**, **301** para los IDs viejos, `noindex` para carrito y
   gestión, y **caché larga** para JS/CSS con hash.
4. Página 404 dentro de la app, `lang="es-AR"`, títulos y descripciones nuevos y coherentes entre HTML estático y app.

El techo actual del sitio no es técnico sino de **contenido y autoridad**: 5 de 8 remeras comparten la misma
descripción genérica, no hay perfil de Google Business ni enlaces externos, y la oferta real (diseños de autor,
entrega en Córdoba, descuentos por cantidad) es lo único sobre lo que conviene posicionar.

---

## 2. Diagnóstico del SEO actual (antes de los cambios)

### Stack y renderizado

| Aspecto | Estado |
| --- | --- |
| Framework | Angular 21, componentes standalone, signals, rutas lazy (`src/app/app.routes.ts`) |
| Renderizado | **CSR puro**. No hay `@angular/ssr`; `src/main.ts` usa `bootstrapApplication` |
| Datos | `httpResource('data/products.json')`, generado por `scripts/build-catalog.mjs` desde `public/products/<slug>/index.json` (Decap CMS) |
| URLs de producto | `/product/<slug>` (slug = carpeta del CMS). IDs viejos `001`–`007` se traducían en el cliente |
| Hosting | Firebase Hosting (deploy en cada push a `main`) + copia en Netlify (CMS y funciones OAuth) |
| HTML de producto | `scripts/build-share-pages.mjs` ya generaba `product/<slug>.html` con OG y canonical |
| Imágenes | `NgOptimizedImage` + loader del Image CDN de Netlify; **en Firebase se sirven los originales** |

### Indexación (verificado con `curl` contra producción)

| URL | Respuesta antes |
| --- | --- |
| `/robots.txt` | 200 `text/html` (index.html) |
| `/sitemap.xml` | 200 `text/html` (index.html) |
| `/no-existe` | 200 (soft-404) |
| `/product/006` | 200 con el HTML genérico; la app redirigía en el cliente |
| `/product/medusa` | 200, título y OG propios, `<app-root>` vacío |
| `blakstreetwear.netlify.app` | 200, copia completa del sitio |

---

## 3. Problemas detectados (con evidencia)

| # | Problema | Evidencia |
| --- | --- | --- |
| 1 | Sin robots.txt ni sitemap | No había archivos en `public/`; `firebase.json` tenía `"rewrites": [{ "source": "**", "destination": "/index.html" }]` |
| 2 | Soft-404 global | Esa misma rewrite + `{ path: '**', redirectTo: '' }` en `app.routes.ts` y `/* /index.html 200` en `netlify.toml` |
| 3 | Canonical dependiente del hosting | `build-share-pages.mjs`: `SITE_URL = process.env.URL` (Netlify define su propia URL) |
| 4 | Redirecciones 301 solo en Netlify | `_redirects` lo ignora Firebase; en Firebase `/product/006` respondía 200 |
| 5 | Sin JSON-LD | Ninguna aparición de `ld+json` en el repo |
| 6 | Contenido solo con JS | `<app-root></app-root>` vacío en todas las páginas |
| 7 | Solo productos tenían HTML propio | `/products`, `/mayoristas`, `/about` compartían título/descripción del inicio en el HTML |
| 8 | `og:image:width/height` falsos en Firebase | Se declaraba 1200×630 aunque fuera de Netlify se servía la foto original sin recortar |
| 9 | Meta description de producto = descripción del CMS | `product-detail.component.ts`; **5 remeras comparten** "Diseño limpio y minimalista. Ideal para combinar con cualquier outfit." y otra dice solo "remera anime" |
| 10 | Idioma genérico | `<html lang="es">` |
| 11 | Carrito y gestión indexables | Sin `noindex` (el panel `/admin` sí lo tenía) |
| 12 | Imagen de 3,9 MB | `public/products/naruto-y-kurama/naruto-kurama.jpg`; en Firebase no pasa por ningún CDN de imágenes |
| 13 | Home pesada | Chunk `home-routes` de 663 kB (three.js del vestuario 3D), carga antes de mostrar el contenido de la home |
| 14 | H1 del inicio poco descriptivo | `home-showroom.component.html`: `<h1>BLAK</h1>` (decisión de diseño; ver pendientes) |
| 15 | Sin caché para assets con hash | Firebase servía JS/CSS con hash con la caché por defecto (1 h) |
| 16 | Inconsistencia de oferta | `/mayoristas` habla de "remera, chomba o buzo", pero el catálogo tiene solo remeras |

---

## 4. Tabla de prioridades

| Prioridad | Tema | Estado |
| --- | --- | --- |
| **P0** | robots.txt y sitemap.xml reales | ✅ Hecho |
| **P0** | 404 reales (hosting + app) | ✅ Hecho |
| **P0** | Canonical único al dominio principal (Firebase y Netlify) | ✅ Hecho |
| **P0** | Alta en Google Search Console + envío del sitemap | ⏳ Manual (sección 9) |
| **P1** | JSON-LD Product/Offer/BreadcrumbList/Organization/WebSite/ItemList | ✅ Hecho |
| **P1** | HTML estático con contenido rastreable en páginas públicas | ✅ Hecho |
| **P1** | 301 de IDs viejos en Firebase | ✅ Hecho |
| **P1** | Títulos y descripciones únicos | ✅ Hecho, con descripciones nuevas en el CMS (revisar texto) |
| **P1** | Comprimir `naruto-kurama.jpg` (3,9 MB) y fotos de 2560 px | ✅ Hecho |
| **P1** | Decidir el dominio definitivo (¿dominio propio?) | ⏳ Decisión de negocio |
| **P2** | `noindex` carrito/gestión, `lang="es-AR"`, caché de assets | ✅ Hecho |
| **P2** | Diferir la carga de three.js en la home | ✅ Hecho |
| **P2** | Google Business Profile | ⏳ Manual, si el negocio es elegible |
| **P2** | Datos de envío/devoluciones (`STORE_INFO`) para OfferShippingDetails/MerchantReturnPolicy | ⏳ Falta información comercial |
| **P3** | SSG con `@angular/ssr` | 📄 Evaluado, no recomendado ahora (ver 5.1) |
| **P3** | Páginas de colección indexables | 📄 Cuando haya colecciones con 4+ remeras |

---

## 5. Cambios implementados

### 5.1 Decisión de arquitectura: HTML estático post-build en vez de SSR/SSG

**Opciones evaluadas:**

- **SSG con `@angular/ssr` (`outputMode: "static"`)**: es la solución "de libro", pero suma `@angular/ssr`,
  `@angular/platform-server` y configuración de servidor; obliga a revisar todo el código que toca `window`/`document`
  en inicializadores (vestuario three.js en `home-showroom-scene.ts`, header, share-buttons, `localStorage`), resolver
  `httpResource` con URLs relativas durante el prerender y validar hidratación. Para 8 productos el costo y el riesgo
  de romper la home superan el beneficio.
- **Ampliar el post-build que ya existía** (`build-share-pages.mjs` → `build-static-pages.mjs`): cero dependencias,
  cero cambios en componentes, mismo deploy. **Elegida.**

**Qué hace `scripts/build-static-pages.mjs`** (corre en `postbuild`):

- Toma el `index.html` que genera Angular y escribe `index.html`, `products.html`, `mayoristas.html`, `about.html`,
  `product/<slug>.html`, `cart.html`, `gestion.html` y `404.html`.
- En cada página pública: `<title>`, meta description, `<link rel="canonical">` **siempre** a
  `https://blakstreetwear.web.app`, Open Graph, Twitter Card y JSON-LD.
- Dentro de `<app-root>` escribe el contenido real en HTML simple (H1, precio, talles, color, pago/entrega, migas,
  enlaces a otras remeras). Angular reemplaza ese contenido al arrancar; es el mismo contenido que ve el usuario, no
  cloaking. Tiene estilos mínimos de la marca porque solo se ve hasta que carga el JS.
- `robots.txt`, `sitemap.xml` con extensión de imágenes y `_redirects` para Netlify.
- Lee los datos de la misma fuente que la app (`data/products.json`, `wholesale.json`, constantes de
  `site.constants.ts`, `whatsapp.constants.ts`, `store-info.constants.ts`, `legacy-products.constants.ts`); no hay datos
  cargados a mano.
- Avisa en consola si falta en `firebase.json` la 301 de algún ID viejo.

**Limitación conocida:** el título/descripción de producto existe en dos lugares (`src/app/core/seo/product-seo.ts` y
el script) porque Node 22 no importa TypeScript sin flags. Están comentados para mantenerlos en sync, hay tests de la
versión de la app, y se verificó que los 8 productos generan exactamente el mismo texto en ambos.

### 5.2 Hosting

- **`firebase.json`**: se quitó la rewrite `** → /index.html`. Ahora: 7 redirecciones 301
  `/product/00N → /product/<slug>`, rewrite solo para `/gestion/**`, `X-Robots-Tag: noindex` en `/cart` y `/gestion`,
  `Cache-Control: immutable` 1 año para JS/CSS/fuentes con hash, 1 día para imágenes y 5 min para `data/*.json`.
  Firebase sirve `404.html` con estado 404 para todo lo demás. No se usa `trailingSlash: false`: haría que
  `/admin/` redirija a `/admin` y Decap CMS dejaría de encontrar `config.yml` (lo carga con ruta relativa).
- **`netlify.toml`**: mismo criterio (sin comodín, `noindex` y caché por cabecera; rewrites/301 en `_redirects`).

### 5.3 App Angular

- `src/index.html`: `lang="es-AR"`, título y descripción nuevos.
- Títulos de ruta alineados con el HTML estático (home, colección, mayoristas, el estudio).
- `features/not-found/not-found.component.ts`: la ruta `**` ya no manda al inicio; muestra "Página no encontrada"
  con enlaces a la colección y al inicio.
- `core/seo/product-seo.ts` (+ spec): título `Remera <nombre> · BLAK Streetwear` y descripción con precio, talles
  disponibles, descripción del CMS y entrega, recortada a 160 caracteres en palabra completa.
- Detalle de producto: usa esas funciones (antes la descripción era solo el texto del CMS) y el ALT de la foto
  principal pasa de `<nombre>` a `Remera <nombre>`.

### 5.4 Segunda tanda: contenido, imágenes y rendimiento

- **Descripciones de producto** (`public/products/*/index.json`, lo mismo que edita Decap CMS): se reescribieron
  Medusa, Take Control, The Rose System, Blak Minimal Series 001 y 002, Naruto y Kurama y Positive Energy. Describen
  **solo lo que se ve en cada diseño** (frases, ilustración, ubicación de la estampa); no agregan material, gramaje ni
  técnica. En Positive Energy se mantuvo "100% algodón", que ya estaba cargado. Stitch Art no se tocó. **Revisarlas en
  el CMS** y ajustar el tono si hace falta.
- **Fotos** redimensionadas a 1920 px de ancho, JPEG calidad 82, mismo nombre de archivo:
  `naruto-kurama.jpg` 3.891 → 156 kB; `positive-energy`, `stitch-art` y `the-rose-system` (mockup) de ~450 a
  ~180 kB. Se revisaron visualmente.
- **three.js en chunk propio** (`home-showroom.component.ts`): la escena 3D se importa con `import()` dinámico,
  pedido en paralelo con el primer render. El chunk de la home pasó de **663 kB a 38 kB**; three.js (~625 kB) llega
  aparte. Si la descarga falla, la home muestra la portada de respaldo que ya existía. Verificado en Chrome: el
  vestuario 3D carga igual que antes.

### 5.5 Datos estructurados

| Página | Tipos |
| --- | --- |
| `/` | `Organization` (nombre, logo, Córdoba AR, contacto por WhatsApp) + `WebSite` |
| `/products` | `ItemList` (URL de cada remera) + `BreadcrumbList` |
| `/product/<slug>` | `Product` (nombre, descripción, todas las imágenes, SKU = slug, marca, color si es único) + `Offer` (precio, ARS, `InStock`/`OutOfStock` según variantes disponibles, `NewCondition`) + `BreadcrumbList` |
| `/mayoristas`, `/about` | `BreadcrumbList` |

No se agregaron reseñas, calificaciones, `shippingDetails` ni `hasMerchantReturnPolicy`: no hay datos confirmados
(`STORE_INFO.shippingCost` y `shippingArea` están en `null`). Google los marca como "recomendados", no obligatorios:
Search Console mostrará advertencias, no errores. `LocalBusiness` no se usó porque no hay local con dirección y
horario publicados; `Organization` con localidad es lo correcto para un negocio online.

---

## 6. Archivos modificados

| Archivo | Cambio |
| --- | --- |
| `scripts/build-share-pages.mjs` → `scripts/build-static-pages.mjs` | Renombrado y ampliado (ver 5.1) |
| `package.json` | `postbuild` apunta al script nuevo |
| `firebase.json` | Hosting: sin comodín, 301, rewrites, cabeceras |
| `netlify.toml` | Sin comodín, cabeceras |
| `src/index.html` | `lang`, título, descripción |
| `src/app/app.routes.ts` | Ruta `**` → `NotFoundComponent` |
| `src/app/features/*/…routes.ts` (home, products, wholesale, about) | Títulos |
| `src/app/features/product-detail/product-detail.component.ts` | Título/descripción SEO, ALT |
| `src/app/core/constants/site.constants.ts` | **Nuevo**: dominio principal y nombre |
| `src/app/core/seo/product-seo.ts` + `.spec.ts` | **Nuevo** |
| `src/app/features/not-found/not-found.component.ts` | **Nuevo** |
| `SEO_AUDIT.md` | **Nuevo** (este documento) |
| `src/app/features/home/home-showroom.component.ts` | Import dinámico de la escena 3D |
| `public/products/*/index.json` (7) | Descripciones nuevas |
| `public/products/{naruto-y-kurama,positive-energy,stitch-art,the-rose-system}/*.jp(e)g` | Fotos comprimidas |

---

## 7. Keywords objetivo y páginas recomendadas

**Importante:** no hay volúmenes ni dificultades numéricas porque no se consultó ninguna herramienta con datos
verificables. La dificultad es una **estimación cualitativa** según el tipo de competidor que suele aparecer
(marketplaces y grandes marcas = alta). Validar con Google Keyword Planner (gratis con cuenta de Ads) o con las
consultas reales de Search Console después de 4–6 semanas.

| Keyword | Intención | Relevancia comercial | Dificultad estimada | Prioridad | Página de destino |
| --- | --- | --- | --- | --- | --- |
| remeras de autor / remeras de diseño de autor | Transaccional | Alta: es la propuesta de la marca | Media | **Alta** | `/` y `/products` |
| remeras estampadas córdoba | Transaccional local | Alta | Media-baja | **Alta** | `/` |
| remeras streetwear córdoba | Transaccional local | Alta | Baja | **Alta** | `/` y `/about` |
| remeras con diseños originales | Comercial | Alta | Media | Media | `/products` |
| remeras estampadas | Transaccional | Alta | Alta (marketplaces) | Media | `/products` |
| remera anime / remera naruto | Transaccional | Media (1 producto) | Alta | Media | `/product/naruto-y-kurama` |
| remera stitch | Transaccional | Media (1 producto) | Alta | Baja | `/product/stitch-art` |
| remeras por mayor córdoba | Transaccional B2B | Alta (oferta real: 10–20 % off desde 5 prendas) | Media | **Alta** | `/mayoristas` |
| comprar remeras online argentina | Transaccional | Media | Alta | Baja | — (**no** hay envío nacional confirmado) |
| remeras personalizadas | Transaccional | — | Alta | **No trabajar** | — |
| remeras personalizadas para equipos | Transaccional | — | Media | **No trabajar** | — |

- **Personalizadas / equipos:** el último commit (`b806c1d Remove teams apparel feature`) quitó esa oferta. Crear
  landings para esas búsquedas sería prometer algo que no se vende. Si vuelve el servicio, merece su propia página.
- **Argentina:** el sitio solo confirma entrega en Córdoba. Si se habilitan envíos nacionales, cargarlo en
  `STORE_INFO`, mencionarlo en las descripciones y sumar `OfferShippingDetails`.
- **Landings nuevas:** no se recomienda crear ninguna por ahora. Con 8 productos, una página por keyword sería
  contenido casi idéntico. Cuando una colección del CMS (ej. "Blak Minimal Series", "Anime") tenga 4+ remeras, convertir
  `?coleccion=<slug>` en una ruta propia (`/colecciones/<slug>`) con texto propio, H1 y entrada en el sitemap.

---

## 8. Mejoras pendientes

### Requieren intervención manual / información del negocio

1. **Revisar las descripciones nuevas** y sumar datos que solo el negocio conoce: técnica de estampado (DTF, serigrafía,
   vinilo), algodón/gramaje, calce (regular u oversize). Al subir fotos nuevas por el CMS, que no pasen de ~1920 px.
2. *(Hecho: compresión de fotos.)*
3. **Guía de talles**: `STORE_INFO.sizeChart` está vacío. Medidas reales ayudan a convertir y son contenido único.
4. **Envío y cambios**: completar `shippingArea`, `shippingCost` y una política de cambios. Con eso se puede agregar
   `OfferShippingDetails` y `MerchantReturnPolicy` al JSON-LD.
5. **Redes sociales**: si existe Instagram/TikTok de la marca, agregarlo a `sameAs` en `organizationSchema` del script
   y enlazarlo en el footer.
6. **Dominio propio** (ej. `blak.com.ar`, costo anual bajo en NIC Argentina): mejora confianza y CTR. Si se hace,
   cambiar `SITE_URL`, conectar el dominio en Firebase y verificarlo en Search Console.
7. **Netlify como espejo**: el canonical ya apunta a Firebase. Si Netlify solo se usa para el login del CMS,
   conviene que su sitio redirija todo con 301 a `blakstreetwear.web.app` (dejando fuera `/.netlify/functions/*`).
8. **Texto de /mayoristas**: menciona "chombas o buzos" que no están en el catálogo; aclarar o quitar.

### Técnicas (no hechas para no tocar diseño/funcionalidad sin acuerdo)

- **H1 del inicio**: hoy es "BLAK". Un H1 como "BLAK — remeras de autor de Córdoba" ayuda a la relevancia, pero cambia
  el diseño del vestuario; queda a criterio de la marca.
- **Fuentes**: Google Fonts se carga con una hoja bloqueante. Se puede autoalojar Big Shoulders y Public Sans o cargar
  la hoja de forma asíncrona.
- **Imágenes en Firebase**: el loader solo optimiza en Netlify. En Firebase se sirven originales; si las fotos crecen,
  conviene generar versiones WebP en `build-catalog.mjs` o publicar desde Netlify.
- **SSG con `@angular/ssr`**: revisar si el catálogo pasa de ~50 productos o se agregan colecciones con contenido.

### Mejoras de conversión (CRO, separadas de SEO)

- La propuesta de valor es clara en la home y en `/about`; falta **prueba social real** (fotos de clientes, cantidad de
  pedidos, Instagram) — nunca reseñas inventadas.
- El costo de envío no se muestra: es la principal fricción antes de escribir por WhatsApp.
- El precio con descuento por cantidad ya se ve en cada remera: bien.
- Sin guía de talles, cada duda pasa a WhatsApp: completarla reduce fricción.

---

## 9. Guía de Google Search Console

1. Entrar a <https://search.google.com/search-console> con la cuenta de Google del negocio.
2. **Agregar propiedad → Prefijo de URL** → `https://blakstreetwear.web.app/` (sin dominio propio no se puede usar la
   propiedad "Dominio").
3. Verificar con **etiqueta HTML**: copiar el `<meta name="google-site-verification" …>` y pegarlo en `src/index.html`
   dentro de `<head>`; hacer push a `main` y esperar el deploy. (Alternativa: subir el archivo HTML de verificación a
   `public/`.)
4. **Sitemaps** → enviar `sitemap.xml`. Debe quedar "Correcto" con 12 URLs.
5. **Inspección de URLs** → probar `/` y una remera → "Solicitar indexación". Mirar en "Ver página probada" que el
   HTML renderizado tenga título, H1 y JSON-LD.
6. **Mejoras → Fragmentos de productos / Listados de comerciantes y Rutas de exploración**: revisar en 1–2 semanas.
   Las advertencias por `shippingDetails`/`hasMerchantReturnPolicy` se resuelven con el punto 4 de pendientes.
7. Probar también cada remera con <https://search.google.com/test/rich-results>.
8. Opcional: crear cuenta en **Google Merchant Center** (gratis) para los listados gratuitos de Shopping usando los
   datos estructurados ya publicados.
9. **Google Business Profile**: solo si el negocio atiende clientes en persona (retiro en un punto o zona de entrega).
   Se puede crear como "negocio de servicio en el área" sin mostrar dirección. Usar exactamente el mismo nombre,
   teléfono de WhatsApp y URL que el sitio.
10. Bing Webmaster Tools permite importar la propiedad desde Search Console en un paso.

---

## 10. KPIs (30, 60 y 90 días)

Partir de la línea base de Search Console de las primeras 2 semanas; no hay datos históricos para fijar metas
numéricas sin inventarlas.

| Plazo | Qué medir | Señal de que va bien |
| --- | --- | --- |
| **30 días** | Páginas indexadas (Indexación → Páginas), errores de sitemap, fragmentos de producto válidos, URLs con 404 | Las 12 URLs del sitemap indexadas; 0 errores en datos estructurados; sin "Soft 404" ni "Duplicada sin canonical" |
| **60 días** | Impresiones y CTR por consulta y por página; consultas con "córdoba", "de autor", "por mayor" | Impresiones crecientes en consultas de marca + Córdoba; CTR de producto por encima del promedio del sitio |
| **90 días** | Clics orgánicos, posición media de consultas objetivo, clics en WhatsApp desde visitas orgánicas | Clics orgánicos sostenidos mes a mes; pedidos de WhatsApp que mencionen haber llegado por Google |

Para atribuir ventas: el mensaje de WhatsApp ya incluye el nombre de la remera; preguntar "¿cómo nos conociste?" al
confirmar el pedido es la forma más barata de medir. Si se instala analítica, que sea una gratuita y respetuosa con la
privacidad (Search Console + GA4 o similar), registrando el clic en "Consultar/Pedir por WhatsApp" como conversión.

---

## 11. Validaciones realizadas

| Verificación | Resultado |
| --- | --- |
| Build de producción (`npm run build`, incluye catálogo y post-build) | ✅ Sin errores; bundle inicial sin cambios (≈363 kB / 94 kB transferidos); chunk de la home 663 → 38 kB |
| Navegador real (Chrome headless sobre el `dist`) | ✅ Angular reemplaza el contenido estático (un solo H1); home con vestuario 3D, detalle, colección, 404 y `/product/006` → Medusa funcionan |
| Tests (`ng test`) | ✅ 41/41 (4 nuevos) |
| Texto SEO app vs. HTML estático | ✅ Idéntico en las 8 remeras |
| JSON-LD | ✅ JSON válido en todas las páginas; campos obligatorios de Product (`name`, `offers.price`, `priceCurrency`) presentes |
| Sitemap / robots | ✅ XML válido, 12 URLs, todas con archivo existente en `dist` |
| Enlaces internos del HTML estático | ✅ Todos apuntan a páginas que existen |
| Estados HTTP con el emulador de Firebase Hosting | Ver tabla de abajo |

Emulador de Firebase Hosting (`firebase-tools@15.30.1`) sobre el `dist` generado:

| URL | Antes (producción) | Ahora (emulador) |
| --- | --- | --- |
| `/`, `/products`, `/products?talle=M`, `/mayoristas`, `/about`, `/product/medusa` | 200 | 200, cada una con su HTML |
| `/robots.txt` | 200 `text/html` | 200 `text/plain` |
| `/sitemap.xml` | 200 `text/html` | 200 `application/xml` |
| `/no-existe`, `/product/no-existe` | 200 | **404** |
| `/cart`, `/gestion`, `/gestion/costos` | 200 | 200 (HTML con `noindex`) |
| `/admin/`, `/admin/config.yml` | 200 | 200 (CMS sin cambios) |
| `/product/006` | 200 | 404 en el emulador (ver nota) |

**Nota:** este emulador ignoró `redirects` y `headers` incluso con una config mínima de prueba aparte, así que las
**301 y las cabeceras (`noindex`, `Cache-Control`) no se pudieron verificar localmente**. La sintaxis sigue la
documentación de Firebase Hosting. Aunque una 301 fallara, `/product/006` sirve `404.html`, Angular arranca y la app
sigue redirigiendo al slug nuevo como antes.

**Pendiente de verificar después del deploy:**

```sh
curl -sI https://blakstreetwear.web.app/product/006   # 301 → /product/medusa
curl -sI https://blakstreetwear.web.app/cart          # x-robots-tag: noindex
curl -sI https://blakstreetwear.web.app/no-existe     # 404
```

Además: Lighthouse/PageSpeed en el sitio publicado, Rich Results Test y Search Console (requieren el deploy), y el
comportamiento de Netlify (no se pudo emular).
