# Especificación técnica

## 1. Arquitectura

```text
Firebase Hosting (web pública: blakstreetwear.web.app)
  Angular 21
  /data/products.json, /data/wholesale.json, /data/checkout.json
      |                                   ^
      | HTTPS + CORS                      | lectura del catálogo publicado
      v                                   |
Netlify Functions (sitio sólo-API: blakstreetwear.netlify.app)
  create-checkout -------> Mercado Pago Preferences API
  order-status ----------> Mercado Pago Payments API (refresh acotado)
  mercado-pago-webhook --> Mercado Pago Payments API
  withdrawal-request
  admin-orders / admin-order / admin-order-update / admin-withdrawals
      |
      v  Firebase Admin SDK
Cloud Firestore (southamerica-west1)
  orders/{orderId}
  withdrawalRequests/{id}
  rateLimits/{key}
```

- Firebase Hosting es la única web pública. Sirve la SPA y los JSON del catálogo.
- Netlify aloja únicamente Functions. No publica el frontend.
- Firestore es la fuente de verdad de pedidos y estados internos.
- Mercado Pago es la fuente de verdad del estado financiero.
- El catálogo publicado en Firebase Hosting es la fuente de verdad del precio comercial.

### 1.1 Presupuesto gratuito

| Servicio | Plan | Uso previsto |
|---|---|---|
| Firebase Hosting | Spark | Ya en uso; los JSON de catálogo son de pocos KB |
| Cloud Firestore | Spark (50k lecturas, 20k escrituras, 20k borrados por día) | Unas 5-10 escrituras por pedido |
| Netlify | Free (Legacy): 300 build min, 100 GB de ancho de banda; límite de Functions en "Usage → Compute" | Unas 10 invocaciones por compra; sin Background Functions ni Blobs |
| GitHub Actions | Free | Deploy actual de Firebase sin cambios |
| Mercado Pago | Sin costo fijo | Sólo comisión por venta |

Restricciones derivadas:

- La cuenta de Netlify está en el plan Free **Legacy**. No se migra a los planes por créditos ni se
  hace upgrade: el plan legacy es el más conveniente para este uso.

- No se usan Background Functions, Scheduled Functions ni ningún producto con costo variable de
  Netlify. Todo se procesa dentro de la invocación.
- No se usa Cloud Functions de Firebase (requiere plan Blaze).
- No hay tareas programadas: los vencimientos se resuelven al leer (ver 5.3).
- Netlify sólo compila cuando cambia código del backend (ver 7.2), para cuidar los minutos de build.

## 2. Integración elegida

- Producto: Mercado Pago Checkout Pro.
- API: Preferences API.
- SDK backend: SDK oficial de Node.js (`mercadopago`).
- Relación: `external_reference` contendrá el identificador interno del pedido.
- Redirección: `init_point`. Durante la integración se usan credenciales de prueba y cuentas de
  prueba (vendedor y comprador) de Mercado Pago.
- Confirmación: Webhooks del evento `payment`, configurados en el panel de la aplicación de Mercado
  Pago ("Tus integraciones → Webhooks"), con URL de prueba y URL productiva separadas y validación de
  `x-signature`. No se envía `notification_url` en la preferencia, para que todas las notificaciones
  lleguen por un único canal firmado.

Referencias oficiales:

- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/overview
- https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/create-payment-preference
- https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post
- https://www.mercadopago.com.ar/developers/en/docs/checkout-pro-preferences/payment-notifications

### 2.1 Preferencia

```text
external_reference   orderId
items[]              una línea por producto/talle/color
  id                 productId
  title              "<nombre> · <talle> · <color>"
  quantity           cantidad
  unit_price         precio unitario con descuento mayorista, entero
  currency_id        "ARS"
  picture_url        URL absoluta de la imagen en Firebase Hosting
payer                name, surname, email, phone
back_urls            success/pending/failure = {APP_BASE_URL}/checkout/result?order={orderId}
auto_return          "approved"
payment_methods
  excluded_payment_types  [{ id: "ticket" }, { id: "atm" }]
  installments            6
binary_mode          false
expires              true
expiration_date_to   createdAt + 2 h
statement_descriptor "BLAKSTREETWEAR"
metadata             { order_id, schema_version }
```

- Como el descuento se aplica por unidad y se redondea por unidad, la suma de las líneas coincide
  exactamente con `pricing.total`.
- `unit_price` nunca es negativo ni cero; no se usan líneas de descuento.

## 3. Componentes frontend

### Configuración

- `apiBaseUrl` se define en una constante tipada por entorno (`https://blakstreetwear.netlify.app` en
  producción; `http://localhost:8888` con `netlify dev`). No contiene secretos.
- `public/data/checkout.json`, editable desde Decap CMS:

  ```json
  {
    "mercadoPagoEnabled": true,
    "pickupLocation": "Nueva Córdoba, a coordinar por WhatsApp",
    "termsVersion": "2026-11-01"
  }
  ```

  Reemplaza a `STORE_INFO.pickupLocation`. Es el interruptor para volver al flujo de WhatsApp.
- `public/data/seller.json`, editable desde Decap CMS: datos del titular de la venta (nombre, CUIT,
  domicilio, email, condición fiscal y marca `provisional`). Su forma y reglas están en
  [Textos legales](./legal-texts.md#datos-del-vendedor). Lo consumen el pie, las páginas legales y
  `create-checkout`. Ningún componente escribe datos del vendedor a mano.

### Pricing compartido

- `src/app/core/pricing/` pasa a ser código sin dependencias de Angular, importado tanto por el carrito
  como por las Functions.
- `discountAmountFor` se reemplaza por un cálculo por línea: `total = Σ discountedUnitPrice(price,
  tier) × quantity` y `discount = subtotal − total`. El carrito y el backend usan la misma función.

### Checkout del carrito

Responsabilidades:

- Mostrar resumen calculado localmente como vista previa.
- Capturar datos del comprador y la aceptación de términos mediante Reactive Forms.
- Mostrar el lugar de retiro sin solicitar dirección.
- Enviar identificadores, variantes, cantidades, cliente, modalidad de retiro y `expectedTotal`.
- Resolver errores de validación y el flujo de cambio de precio (`CATALOG_CHANGED`): actualizar los
  precios del carrito con los devueltos, marcar variantes no disponibles y pedir nueva confirmación
  con un `clientRequestId` nuevo.
- Generar un `clientRequestId` por intento de pago y reutilizarlo sólo en reintentos de red del mismo
  intento.
- Guardar `{ orderId, orderCode, orderAccessToken, cartItemKeys, createdAt }` en localStorage
  (`blak-checkouts`), conservando como máximo 5 entradas y descartando las de más de 30 días.
- Redirigir a la URL devuelta por el backend.
- Si `checkout.json` indica `mercadoPagoEnabled: false`, ocultar el pago y dejar WhatsApp como acción
  primaria.

### Resultado de pago

Nueva ruta lazy: `/checkout/result`.

- Toma `order` del query string y busca el token guardado para ese pedido.
- Consulta `order-status` con backoff (1 s, 2 s, 4 s, 8 s, 15 s; máximo 5 intentos) mientras el
  estado sea `checkout_pending` o `payment_pending`. Luego ofrece "Volver a consultar".
- No interpreta `status`, `payment_id` ni `merchant_order_id` de la URL como confirmación.
- Con `paid`, quita del carrito sólo las claves `productId|size|color` capturadas por ese pedido y
  borra la entrada local.
- Si falta el token local (pago terminado en la app de Mercado Pago o en otro navegador), muestra un
  mensaje genérico con el número de pedido, aclara que Mercado Pago envía el comprobante por email y
  ofrece WhatsApp. No consulta datos del pedido.

### Gestión de pedidos

Nuevas rutas lazy: `/gestion/pedidos` y `/gestion/arrepentimientos`.

- Obtienen un Firebase ID token de la sesión administrativa.
- Lo envían como `Authorization: Bearer <id-token>` a endpoints administrativos.
- Netlify verifica el token, `email_verified` y la allowlist antes de responder.

### Páginas legales

Rutas lazy: `/arrepentimiento`, `/terminos`, `/privacidad`. El pie agrega los enlaces y los datos del
vendedor.

## 4. Contratos HTTP

Todas las respuestas usan JSON e incluyen `correlationId` (también en el header `x-correlation-id`).
Los errores tienen la forma `{ "error": { "code": "...", "message": "...", "correlationId": "..." } }`.

Límites comunes: body de 16 KB como máximo; strings recortados y con longitud máxima (nombre y
apellido 60, email 254, teléfono 30).

### `POST /.netlify/functions/create-checkout`

Solicitud:

```json
{
  "clientRequestId": "uuid-v4-generado-en-el-cliente",
  "items": [
    {
      "productId": "medusa",
      "size": "M",
      "color": "Negro",
      "quantity": 2
    }
  ],
  "customer": {
    "firstName": "Nombre",
    "lastName": "Apellido",
    "email": "cliente@example.com",
    "phone": "+5493510000000"
  },
  "delivery": {
    "type": "pickup"
  },
  "expectedTotal": 54000,
  "acceptedTermsVersion": "2026-11-01"
}
```

Respuesta `201`:

```json
{
  "orderId": "ord_opaque_id",
  "orderCode": "BLK-7Q2K9M",
  "orderAccessToken": "opaque_random_token",
  "checkoutUrl": "https://www.mercadopago.com.ar/checkout/...",
  "pricing": {
    "subtotal": 60000,
    "discount": 6000,
    "total": 54000,
    "currency": "ARS"
  }
}
```

Respuesta `409 CATALOG_CHANGED`:

```json
{
  "error": { "code": "CATALOG_CHANGED", "message": "...", "correlationId": "..." },
  "items": [
    { "productId": "medusa", "size": "M", "color": "Negro", "unitPrice": 32000, "available": true }
  ],
  "pricing": { "subtotal": 64000, "discount": 0, "total": 64000, "currency": "ARS" }
}
```

Comportamiento:

1. Aplicar rate limit.
2. Validar tamaño, tipos y longitudes del body antes de acceder a servicios externos.
3. Leer `checkout.json` y `seller.json`. Responder `503 CHECKOUT_DISABLED` si `mercadoPagoEnabled`
   es `false`, o si `seller.provisional` es `true` y `MERCADO_PAGO_LIVE_MODE` es `true`.
4. Verificar que `acceptedTermsVersion` coincida con la vigente.
5. Resolver cada producto desde el catálogo publicado (ver 7.1).
6. Validar talle, color, disponibilidad, cantidad de 1 a 50 y como máximo 30 líneas.
7. Aceptar solamente `delivery.type = pickup`.
8. Recalcular el total con el pricing compartido. Si difiere de `expectedTotal` o hay variantes no
   disponibles, responder `409 CATALOG_CHANGED` sin escribir en Firestore.
9. Idempotencia por `clientRequestId` (documento `orders` buscado por ese campo):
   - si existe con el mismo hash de body y una preferencia vigente, devolver la misma respuesta con
     un token nuevo (el token anterior se reemplaza);
   - si existe con un hash distinto, responder `409 IDEMPOTENCY_CONFLICT`;
   - si existe y está `paid`, responder `409 CHECKOUT_ALREADY_PAID`.
10. Crear el pedido `checkout_pending`.
11. Crear la preferencia (timeout de 8 s).
12. Guardar `preferenceId`, `checkoutUrl` y `expiresAt`. Si Mercado Pago falla, marcar
    `checkout_error` sin borrar el pedido.

Errores funcionales:

| HTTP | Código | Uso |
|---:|---|---|
| 400 | `INVALID_REQUEST` | Body o campos inválidos |
| 400 | `TERMS_NOT_ACCEPTED` | Versión de términos ausente o vieja |
| 409 | `CATALOG_CHANGED` | Precio, variante o disponibilidad cambió |
| 409 | `IDEMPOTENCY_CONFLICT` | Mismo `clientRequestId` con otro contenido |
| 409 | `CHECKOUT_ALREADY_PAID` | La solicitud ya corresponde a un pago aprobado |
| 429 | `RATE_LIMITED` | Demasiados intentos |
| 502 | `PAYMENT_PROVIDER_ERROR` | Mercado Pago no respondió correctamente |
| 503 | `CHECKOUT_DISABLED` | Checkout apagado desde el CMS |
| 500 | `INTERNAL_ERROR` | Error inesperado sin detalles sensibles |

### `POST /.netlify/functions/mercado-pago-webhook`

- No utiliza CORS porque es servidor a servidor.
- Procesa **todo antes de responder**, de forma sincrónica. Mercado Pago espera la respuesta hasta
  unos 22 s; la función tiene un presupuesto de 8 s.
- Pasos:
  1. Si el evento no es `payment` (por `type`/`topic`), responder `200` sin procesar.
  2. Validar `x-signature` con `MERCADO_PAGO_WEBHOOK_SECRET`. El manifiesto es
     `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, donde `data.id` sale del query string y va
     en minúsculas si es alfanumérico. Comparación HMAC-SHA256 en tiempo constante. Si falla,
     responder `401` sin tocar Firestore.
  3. Consultar `GET /v1/payments/{id}` con el Access Token.
  4. Buscar el pedido por `external_reference`. Si no existe, responder `200` y registrar el hecho.
  5. Aplicar el pago al pedido dentro de una transacción de Firestore (ver 5.2).
- Respuestas: `200` cuando el evento quedó aplicado o es ignorable; `500` ante fallas transitorias
  (Mercado Pago o Firestore no disponibles), para que Mercado Pago reintente.
- No se aplica una ventana de tiempo sobre `ts`: como el estado siempre se vuelve a consultar en la
  API, un replay no puede alterar el resultado.
- Nunca toma monto ni estado del body del webhook como verdad.

Mapeo de estado de cada pago:

| Mercado Pago `status` | Estado del pago |
|---|---|
| `approved` | `approved` (si `status_detail = partially_refunded`, guarda el monto devuelto) |
| `pending`, `in_process`, `authorized` | `pending` |
| `in_mediation` | `in_mediation` |
| `rejected` | `rejected` |
| `cancelled` | `cancelled` |
| `refunded` | `refunded` |
| `charged_back` | `charged_back` |

Datos de conciliación por pago, tomados de la misma respuesta de la API:

| Campo del pedido | Origen en `GET /v1/payments/{id}` |
|---|---|
| `feeAmount` | Suma de `fee_details[].amount` con `fee_payer = collector` |
| `netReceivedAmount` | `transaction_details.net_received_amount` |
| `moneyReleaseDate` | `money_release_date` |
| `paymentMethodId` / `paymentTypeId` | `payment_method_id` / `payment_type_id` |
| `installments` | `installments` |

Se guardan tal como los informa Mercado Pago, sin recalcularlos. Si un campo no viene (pagos no
aprobados), queda `null`. Retenciones posteriores como Ingresos Brutos no forman parte del pago y no
se reflejan.

Verificaciones por pago: `external_reference` igual al `orderId`, `currency_id = ARS`,
`transaction_amount = pricing.total`, `collector_id = MERCADO_PAGO_COLLECTOR_ID` y `live_mode`
igual a `MERCADO_PAGO_LIVE_MODE`. Si alguna falla, el pago se guarda con `mismatch: true`.

### `POST /.netlify/functions/order-status`

Se utiliza `POST` para que el token no quede en URLs ni logs de navegación.

Solicitud:

```json
{
  "orderId": "ord_opaque_id",
  "orderAccessToken": "opaque_random_token"
}
```

Respuesta:

```json
{
  "orderId": "ord_opaque_id",
  "orderCode": "BLK-7Q2K9M",
  "status": "paid",
  "updatedAt": "2026-10-30T18:00:00.000Z",
  "summary": {
    "items": 2,
    "total": 54000,
    "currency": "ARS",
    "deliveryType": "pickup",
    "pickupLocation": "Nueva Córdoba, a coordinar por WhatsApp"
  }
}
```

- El token se compara por hash SHA-256 en tiempo constante. Token inválido o pedido inexistente
  devuelven el mismo `404 ORDER_NOT_FOUND`.
- No devuelve email, teléfono ni artículos detallados.
- Refresh acotado: si el pedido está `checkout_pending` o `payment_pending`, tiene más de 20 s y no
  se consultó a Mercado Pago en los últimos 30 s, busca pagos con
  `GET /v1/payments/search?external_reference=<orderId>` y los aplica con la misma lógica del
  webhook.
- Aplica el vencimiento perezoso (5.3).

### `POST /.netlify/functions/withdrawal-request`

- Público, con CORS y rate limit.
- Body: `name`, `email`, `orderCode` (opcional), `reason` (opcional, 500 caracteres).
- Crea `withdrawalRequests/{id}` y devuelve `{ "requestCode": "ARR-XXXXXX" }`.

### Endpoints administrativos

- `GET /.netlify/functions/admin-orders?status=<filtro>&cursor=<cursor>` (20 por página).
- `GET /.netlify/functions/admin-order?id=<orderId>`
- `POST /.netlify/functions/admin-order-update` con
  `{ orderId, fulfillmentStatus?, invoiceReference? }`. Sólo para pedidos `paid`; agrega una
  entrada al historial con `source: "admin:<email>"`.
- `GET /.netlify/functions/admin-withdrawals?cursor=<cursor>`

Requisitos:

- Firebase ID token válido verificado con Firebase Admin.
- Email verificado.
- Email incluido en `ADMIN_EMAIL_ALLOWLIST`.
- Paginación por cursor.

## 5. Modelo Firestore

### 5.1 `orders/{orderId}`

```text
orders/{orderId}
  schemaVersion: 1
  orderCode: "BLK-XXXXXX"
  clientRequestId
  requestHash
  status
  orderAccessTokenHash
  acceptedTermsVersion
  sellerSnapshot           (copia de seller.json al crear el pedido)
    legalName
    cuit
    taxCondition
  customer
    firstName
    lastName
    email
    phone
  delivery
    type: "pickup"
    pickupLocationSnapshot: string | null
  items[]
    productId
    productName
    size
    color
    quantity
    listUnitPrice
    unitPrice
    image
  pricing
    subtotal
    discountPercent
    discountAmount
    total
    refundedAmount
    currency: "ARS"
  mercadoPago
    preferenceId?
    checkoutUrl?
    expiresAt?
    lastSyncedAt?
    payments: map<paymentId,
      status, statusDetail, amount, refundedAmount, liveMode, mismatch, dateLastUpdated,
      paymentMethodId, paymentTypeId, installments,
      feeAmount, netReceivedAmount, moneyReleaseDate>
  flags
    duplicatePayment: boolean
    possibleDuplicateOrder: boolean
  fulfillment
    status: "pending" | "ready" | "picked_up" | null
    invoiceReference: string | null
    updatedAt?
  statusHistory[]          (últimas 20 entradas)
    status
    source                 ("checkout" | "webhook" | "order-status" | "admin:<email>" | "expiry")
    occurredAt
  createdAt
  updatedAt
  paidAt?
```

Consideraciones:

- Los artículos y precios son una captura histórica; no se resuelven nuevamente para mostrar un
  pedido viejo.
- `sellerSnapshot` registra quién vendió, para facturar con el CUIT correcto aunque después cambie el
  titular.
- Los timestamps los genera el servidor.
- El token de consulta nunca se guarda en texto plano.
- Los datos personales no se copian a logs.
- No se guardan los eventos completos de webhook. La idempotencia se basa en `payments` (5.2).

### 5.2 Aplicación de pagos e idempotencia

Dentro de una transacción:

1. Si el pago ya existe en `payments` con `dateLastUpdated` igual o posterior, no hacer nada
   (evento repetido o viejo).
2. Guardar o actualizar el pago.
3. Recalcular el estado del pedido a partir de **todos** sus pagos, con esta precedencia:

| Prioridad | Condición | Estado del pedido |
|---:|---|---|
| 1 | Algún pago con `mismatch` | `review_required` |
| 2 | Algún `charged_back` | `charged_back` |
| 3 | Algún `in_mediation` | `disputed` |
| 4 | Algún `approved` | `paid` |
| 5 | Todos los no rechazados están `refunded` y existe alguno | `refunded` |
| 6 | Algún `pending` | `payment_pending` |
| 7 | Algún `rejected` | `rejected` |
| 8 | Algún `cancelled` | `cancelled` |
| 9 | Sin pagos | se conserva (`checkout_pending`, `checkout_error` o `expired`) |

4. Con más de un pago `approved`, marcar `flags.duplicatePayment`.
5. Al pasar a `paid` por primera vez: fijar `paidAt`, `fulfillment.status = "pending"` y buscar otro
   pedido `paid` del mismo email con el mismo `requestHash` de ítems en las últimas 24 h; si existe,
   marcar `flags.possibleDuplicateOrder` en ambos.
6. Si el estado cambió, agregar entrada a `statusHistory` (recortado a 20).

Como el estado se deriva siempre del conjunto completo de pagos consultado a la API, no hace falta
prohibir transiciones: un evento viejo no puede ganarle a uno más nuevo del mismo pago, y un pago
rechazado no puede tapar a otro aprobado.

### 5.3 Vencimiento perezoso

Sin tareas programadas. Al leer un pedido (order-status, admin, webhook), si está
`checkout_pending` o `checkout_error` y `now > createdAt + 2 h`, se trata como `expired` y se
persiste la transición con `source: "expiry"` cuando la operación ya escribe. El listado
administrativo calcula el estado efectivo al mostrar.

### 5.4 Otras colecciones

```text
withdrawalRequests/{id}
  requestCode, name, email, orderCode?, reason?, createdAt, handled: boolean

rateLimits/{sha256(route + ip)}_{windowStart}
  count, expiresAt
```

- `rateLimits` usa una política TTL de Firestore sobre `expiresAt` (los borrados entran en la cuota
  gratuita).

### 5.5 Índices

- `orders(clientRequestId ASC)`: campo simple, automático.
- `orders(status ASC, createdAt DESC)`.
- `orders(fulfillment.status ASC, createdAt DESC)`.
- `orders(customer.email ASC, requestHash ASC, paidAt DESC)`.
- `withdrawalRequests(createdAt DESC)`: automático.

## 6. Reglas de Firestore

- Los compradores no leen ni escriben `orders`, `withdrawalRequests` ni `rateLimits` directamente.
- Netlify Functions usa Firebase Admin SDK y no depende de reglas cliente.
- Las reglas existentes continúan denegando por defecto.
- La allowlist de administración existe en dos lugares que deben cambiarse juntos:
  `firestore.rules` (gestión de costos actual) y `ADMIN_EMAIL_ALLOWLIST` en Netlify. Las reglas no
  pueden leer variables de entorno; se documenta en `FIREBASE_MANAGEMENT.md`.

## 7. Netlify como backend

### 7.1 Fuente del catálogo

Las Functions **no** empaquetan el catálogo. Lo leen del sitio publicado:

- `{APP_BASE_URL}/data/products.json`
- `{APP_BASE_URL}/data/wholesale.json`
- `{APP_BASE_URL}/data/checkout.json`
- `{APP_BASE_URL}/data/seller.json`

Motivos: es exactamente lo que ve el comprador, evita desfases entre los deploys de Firebase y
Netlify, y un cambio de catálogo desde Decap no requiere rebuild de Netlify.

- Se usa `fetch` con `cache: "no-store"`, timeout de 3 s y caché en memoria de la instancia por 60 s.
- Firebase Hosting invalida su CDN en cada deploy.
- Para que el navegador del comprador tampoco vea precios viejos, `firebase.json` agrega
  `Cache-Control: no-cache` a `/data/**` (hoy se sirve con `max-age=3600`).
- Si el catálogo no responde, `create-checkout` devuelve `503` sin crear el pedido.

### 7.2 Configuración del sitio

`netlify.toml` pasa a describir un sitio sólo-API:

```toml
[build]
  command = "echo 'API only'"
  publish = "netlify/static"
  functions = "netlify/functions"
  ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF -- netlify/ src/app/core/pricing/ package.json package-lock.json netlify.toml"

[functions]
  node_bundler = "esbuild"
```

- `netlify/static/index.html` es una página mínima sin contenido de la tienda.
- Se elimina el redirect SPA `/*` actual.
- El comando `ignore` evita builds de Netlify cuando sólo cambian el frontend o el catálogo.
- Las Functions están en TypeScript, con un `tsconfig` propio en `netlify/` y tests con Vitest.
- Se quita `https://blakstreetwear.netlify.app/__/auth/handler` de `firebase.json` si deja de usarse.

- El sitio de Netlify que se convierte en sólo-API es el existente, `blakstreetwear.netlify.app`. No
  se crea uno nuevo: ese sitio tiene configurado el proveedor OAuth de GitHub que usa Decap.

### 7.3 Decap CMS desde Firebase Hosting

El panel se usa en `https://blakstreetwear.web.app/admin/`. El login con GitHub sigue pasando por
Netlify:

- `public/admin/config.yml` declara `base_url: https://api.netlify.com` y
  `site_domain: blakstreetwear.netlify.app`.
- El sitio de Netlify mantiene instalado el proveedor OAuth de GitHub (Project configuration → Access
  & security → OAuth), con una GitHub OAuth App cuyo callback es `https://api.netlify.com/auth/done`.
- Convertir Netlify en sólo-API no afecta el login, porque el OAuth es una configuración del sitio y no
  depende de lo que publique.
- `blakstreetwear.netlify.app/admin` deja de existir; el único panel es el de Firebase.

### 7.4 Imágenes

El loader actual (`netlify-image-loader.ts`) apunta a `/.netlify/images`, que sólo existe en Netlify.
En Firebase Hosting esa ruta devuelve el `index.html`. Esto es un problema actual, ajeno a esta
integración, pero se vuelve definitivo al convertir Netlify en sólo-API. Debe resolverse antes del
lanzamiento: servir los archivos originales desde Firebase, o apuntar el loader de forma absoluta al
Image CDN de Netlify, si el plan gratuito lo permite para orígenes remotos.

## 8. Configuración y secretos

Variables de entorno de Netlify (scope Functions):

```text
MERCADO_PAGO_ACCESS_TOKEN
MERCADO_PAGO_WEBHOOK_SECRET
MERCADO_PAGO_COLLECTOR_ID
MERCADO_PAGO_LIVE_MODE          true | false
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY            con \n escapados
ADMIN_EMAIL_ALLOWLIST           separados por coma
APP_BASE_URL                    https://blakstreetwear.web.app
ALLOWED_ORIGINS                 separados por coma
```

Reglas:

- La service account se pasa en tres variables y no como JSON completo. AWS Lambda limita el total
  de variables de entorno a 4 KB; el JSON entero lo pone en riesgo.
- La service account tiene sólo el rol `Cloud Datastore User`, no Editor.
- No usar prefijo que exponga variables al frontend.
- Contextos de Netlify: hasta el lanzamiento, todos los contextos usan credenciales de prueba.
  Después, `production` usa credenciales productivas y `branch-deploy`/`deploy-preview` siguen con
  las de prueba.
- No versionar valores reales ni ejemplos con formato de credencial válido.
- Rotar credenciales si aparecen en logs, commits o capturas.
- Un validador tipado falla al arrancar la función si falta alguna variable.

## 9. CORS

Orígenes permitidos en producción:

- `https://blakstreetwear.web.app`
- `https://blakstreetwear.firebaseapp.com`
- Dominio productivo personalizado, cuando exista.

Fuera de producción se agrega `http://localhost:4200`.

Las Functions responden `OPTIONS`, reflejan únicamente orígenes de la allowlist, incluyen
`Vary: Origin` y permiten sólo `POST`/`GET` y los headers `Content-Type` y `Authorization`. El webhook
no expone CORS. CORS no se trata como autenticación.

## 10. Seguridad

- Validación estricta de todos los inputs y límites de longitud.
- Totales calculados únicamente en backend.
- Verificación criptográfica del webhook.
- Consulta posterior del pago a Mercado Pago.
- Comparación de monto, moneda, referencia, entorno y vendedor.
- Idempotencia en creación de checkout y webhooks.
- Rate limiting en Firestore por ventana fija, con IP de `x-nf-client-connection-ip`:

| Endpoint | Límite por IP |
|---|---|
| `create-checkout` | 10 cada 10 min |
| `order-status` | 60 cada 10 min |
| `withdrawal-request` | 5 cada hora |
| Administrativos | 120 cada 10 min |

- IDs de pedido y tokens con `crypto.randomBytes` (pedido: 16 bytes, token: 32 bytes, base64url).
- Respuestas sin stack traces ni credenciales.
- Logs estructurados con order ID y correlation ID, sin PII.
- Retención: los datos personales de pedidos se conservan 2 años desde la venta (respaldo de
  facturación y reclamos) y se anonimizan a pedido del titular. Pedidos `expired`/`checkout_error`
  sin pago se anonimizan a los 30 días. La anonimización es manual, desde un script en `scripts/`,
  sin tareas programadas.

## 11. Confiabilidad

- Si Firestore no está disponible, no se crea una preferencia huérfana.
- Si Mercado Pago falla después de crear el pedido, el pedido queda `checkout_error` y puede
  reintentarse con un `clientRequestId` nuevo.
- Si el webhook se repite, la aplicación es idempotente.
- Si el webhook se demora o se pierde, `order-status` sincroniza contra Mercado Pago.
- Si el comprador cierra la pestaña, el webhook igualmente completa el pedido.
- Si el webhook falla de forma transitoria, responde `500` y Mercado Pago reintenta.
- Los eventos viejos no pueden pisar a los nuevos (5.2).

## 12. Pruebas

### Unitarias

- Validación de requests.
- Resolución de catálogo y variantes.
- Pricing compartido: redondeo por unidad, tramos, coincidencia carrito/backend.
- Detección de `CATALOG_CHANGED` e `IDEMPOTENCY_CONFLICT`.
- Construcción de la preferencia sin secretos en logs y con suma de líneas igual al total.
- Validación de firma con vectores conocidos.
- Mapeo de estados y precedencia con múltiples pagos.
- Vencimiento perezoso.
- Hash/verificación del token de consulta.
- Rate limit.

### Integración

- Firestore Emulator para persistencia, transacciones e índices.
- Cliente HTTP de Mercado Pago simulado para errores, timeouts y respuestas válidas.
- Webhooks firmados válidos, inválidos, duplicados, desordenados y de tópicos ignorados.
- CORS para origen permitido y rechazado.
- Verificación de Firebase ID token para gestión.

### Frontend

- Formulario de invitado, aceptación de términos y validaciones.
- Flujo de cambio de precio.
- Prevención de doble creación de checkout.
- Conservación del carrito ante error/rechazo.
- Limpieza tras confirmación real.
- Resultado sin token local.
- Estados de resultado y foco.
- Checkout apagado desde CMS.
- AXE y navegación completa con teclado.

### Entorno local

- `netlify dev` levanta las Functions en `localhost:8888`.
- Firestore Emulator para datos.
- Webhooks: herramienta "Simular notificación" del panel de Mercado Pago, o un túnel gratuito
  (`cloudflared tunnel`) apuntando a `netlify dev`.

### Manuales antes de producción

- Compra de prueba aprobada.
- Compra de prueba rechazada y luego aprobada con el mismo link.
- Pago pendiente (`in_process`).
- Retorno antes del webhook.
- Webhook duplicado.
- Cambio de precio entre carrito y checkout.
- Variante deshabilitada.
- Link vencido.
- Checkout apagado desde Decap.
- Reembolso total y parcial desde Mercado Pago.
- Compra real controlada por monto bajo y conciliación en Mercado Pago.

## 13. Observabilidad y operación

- Registrar inicio de checkout, preferencia creada, webhook recibido, verificación y transición.
- No registrar bodies completos de comprador ni credenciales.
- Exponer correlation ID al frontend para soporte.
- Consultar en gestión el payment ID y estado detallado.
- Revisar el uso en los paneles de Netlify y Firebase semanalmente durante el lanzamiento.
- Aviso de ventas: notificaciones de la app de Mercado Pago en el teléfono del comercio.
- Procedimientos documentados en `docs/runbooks/checkout.md`: pago pendiente, `review_required`,
  posible duplicado, reembolso, contracargo, solicitud de arrepentimiento y apagado del checkout.

## 14. Despliegue

1. Crear la aplicación de Mercado Pago, cuentas de prueba y credenciales de prueba.
2. Convertir el sitio de Netlify en sólo-API y configurar variables de prueba.
3. Desplegar Functions y registrar la URL de webhook de prueba en el panel de Mercado Pago.
4. Desplegar índices, reglas y política TTL de Firestore.
5. Desplegar Angular en Firebase Hosting con `checkout.json` en `mercadoPagoEnabled: false`.
6. Completar la matriz de pruebas con el checkout habilitado sólo en local.
7. Cargar textos legales y datos fiscales.
8. Activar credenciales productivas y el webhook productivo.
9. Habilitar `mercadoPagoEnabled: true` desde Decap y ejecutar la compra real controlada.
10. Dejar el checkout abierto a todos.

Rollback: poner `mercadoPagoEnabled: false` desde Decap. El commit dispara el deploy de Firebase
(unos minutos) y el backend rechaza nuevas creaciones en cuanto vence su caché de 60 s. Los pedidos en
curso siguen recibiendo webhooks.
