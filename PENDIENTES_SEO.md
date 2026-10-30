# Pendientes SEO · BLAK

Lo que quedó por hacer después de la auditoría. El detalle de cada punto está en `SEO_AUDIT.md`.

## 1. Revisar antes de publicar

- [ ] **Descripciones nuevas de 7 remeras** (en Decap CMS o en `public/products/<slug>/index.json`). Se escribieron mirando
      las fotos y describen solo lo que se ve en cada diseño. Revisar el tono y corregir lo que no te guste:
      - [ ] Medusa
      - [ ] Take Control
      - [ ] The Rose System
      - [ ] Blak Minimal Series 001
      - [ ] Blak Minimal Series 002
      - [ ] Naruto y Kurama
      - [ ] Positive Energy
- [ ] **Fotos comprimidas**: mirar que se vean bien en la web: `naruto-kurama.jpg`, y el mockup de `positive-energy`,
      `stitch-art` y `the-rose-system`.
- [ ] **Probar el sitio en local**: `npm run build` y revisar la home (vestuario 3D), la colección, una remera, el carrito
      y una URL que no exista (tiene que mostrar "Página no encontrada").

## 2. Publicar

- [ ] Hacer commit y push a `main` (eso dispara el deploy a Firebase).

## 3. Verificar después del deploy

Correr esto y comprobar lo que dice cada comentario:

```sh
curl -sI https://blakstreetwear.web.app/product/006   # 301 y location: /product/medusa
curl -sI https://blakstreetwear.web.app/cart          # x-robots-tag: noindex
curl -sI https://blakstreetwear.web.app/no-existe     # 404
curl -s  https://blakstreetwear.web.app/robots.txt    # texto plano con la línea Sitemap
curl -s  https://blakstreetwear.web.app/sitemap.xml   # XML con 12 URLs
```

- [ ] Las 301 de los links viejos funcionan (el emulador local no las pudo probar).
- [ ] Las cabeceras `noindex` y `Cache-Control` aparecen.
- [ ] El panel del CMS (`/admin/`) sigue entrando y guardando.
- [ ] Probar 2–3 remeras en <https://search.google.com/test/rich-results>: sin errores. Las advertencias por envío y
      devoluciones son esperables hasta completar el punto 5.
- [ ] Compartir el link de una remera por WhatsApp y ver que salga la foto, el nombre y el precio.
- [ ] Correr PageSpeed Insights (<https://pagespeed.web.dev/>) en la home y en una remera, en celular, y anotar los
      valores para comparar más adelante.

## 4. Google Search Console

- [ ] Crear la propiedad **Prefijo de URL** → `https://blakstreetwear.web.app/`.
- [ ] Verificar con etiqueta HTML: pegar el `<meta name="google-site-verification" …>` en `src/index.html`, dentro de
      `<head>`, y volver a publicar.
- [ ] Enviar `sitemap.xml` en la sección Sitemaps.
- [ ] Inspeccionar `/` y una remera, y pedir indexación.
- [ ] A las 2 semanas: revisar Indexación → Páginas y Mejoras (fragmentos de producto, rutas de exploración).
- [ ] Opcional: importar la propiedad en Bing Webmaster Tools.
- [ ] Opcional: Google Merchant Center (gratis) para aparecer en Shopping.

## 5. Datos del negocio que faltan

Completarlos en `src/app/core/constants/store-info.constants.ts` (o pasármelos):

- [ ] **Medidas por talle** (ancho de pecho y largo en cm), para `sizeChart`.
- [ ] **Zona y costo de envío**, para `shippingArea` y `shippingCost`. ¿Hay envíos fuera de Córdoba?
- [ ] **Política de cambios** (plazo y condiciones).
- [ ] **Técnica de estampado** (DTF, serigrafía, vinilo…) y **tipo de algodón/gramaje**, para sumar a las descripciones.
- [ ] **Instagram / TikTok** de la marca, si existen: van en `sameAs` del JSON-LD
      (`scripts/build-static-pages.mjs`, `organizationSchema`) y en el footer.

Con envío y cambios cargados se pueden agregar `OfferShippingDetails` y `MerchantReturnPolicy` a los datos
estructurados.

## 6. Decisiones pendientes

- [ ] **Dominio propio** (ej. `.com.ar`). Si se hace: cambiar `SITE_URL` en `src/app/core/constants/site.constants.ts`,
      conectar el dominio en Firebase y crear la propiedad nueva en Search Console.
- [ ] **Copia en Netlify** (`blakstreetwear.netlify.app`): dejarla como está (el canonical ya apunta a Firebase) o
      redirigir todo con 301 a Firebase, salvo `/.netlify/functions/*`, que usa el login del CMS.
- [ ] **Página de mayoristas**: menciona "chombas o buzos", pero el catálogo tiene solo remeras. ¿Corregir el texto?
- [ ] **H1 de la home**: hoy dice solo "BLAK". ¿Sumar "remeras de autor de Córdoba"? Cambia el diseño del vestuario.
- [ ] **Google Business Profile**: solo si atienden en persona o tienen zona de entrega definida (se puede crear sin
      mostrar la dirección).

## 7. Seguimiento (30 / 60 / 90 días)

- [ ] **30 días**: las 12 URLs del sitemap indexadas, 0 errores en datos estructurados, sin "Soft 404".
- [ ] **60 días**: impresiones y CTR en Search Console para búsquedas con "córdoba", "de autor" y "por mayor".
- [ ] **90 días**: clics orgánicos sostenidos; preguntar "¿cómo nos conociste?" al confirmar cada pedido por WhatsApp.
