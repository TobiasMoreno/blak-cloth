# Checkout con Mercado Pago

Estado: **aprobado para implementación**

Producto: **BLAK Streetwear**

Solución: **Mercado Pago Checkout Pro mediante Preferences API**

## Objetivo

Permitir que una persona compre como invitada, pague en el entorno seguro de Mercado Pago y vuelva
a BLAK para consultar el resultado. La aplicación debe registrar el pedido en Firestore y considerar
un pago confirmado únicamente después de verificarlo desde el backend.

## Documentos

- [Especificación funcional](./functional.md)
- [Especificación técnica](./technical.md)
- [Plan de implementación](./tasks.md)
- [Textos legales](./legal-texts.md)
- [Comisiones de Mercado Pago](./comisiones.md)

## Decisiones confirmadas

- El comprador no necesita una cuenta de BLAK.
- Se utilizará Checkout Pro con redirección a Mercado Pago.
- La web pública es la de Firebase Hosting (`blakstreetwear.web.app`). Es el único origen público.
- Netlify se usa **solamente** para alojar las Functions del backend. El sitio de Netlify deja de
  publicar el frontend Angular.
- Toda la solución debe funcionar dentro de los planes gratuitos de Firebase (Spark), Netlify (Free)
  y GitHub Actions. No se incorpora ningún servicio pago ni de terceros adicional.
- Los pedidos se guardarán en Cloud Firestore dentro del proyecto Firebase existente.
- El backend recalculará catálogo, descuentos y total; nunca confiará en precios enviados por el
  navegador. Lee el catálogo publicado en Firebase Hosting, el mismo que ve el comprador.
- El Access Token y el secreto de webhooks existirán solamente en Netlify.
- El estado retornado en la URL de Mercado Pago no confirmará por sí mismo una venta.
- La comisión de Mercado Pago será absorbida por el comercio y no se agregará como recargo separado
  al comprador. No se ofrecen cuotas sin interés; las cuotas con interés las paga el comprador.
- No se aceptan medios de pago en efectivo (Rapipago, Pago Fácil) en la primera versión, para evitar
  pedidos pendientes durante días.
- El comprador podrá pagar como invitado. Firebase Authentication continuará reservado para la
  gestión interna.
- La primera versión permitirá únicamente retiro; el envío se incorporará en una etapa futura.
- No se manejarán cantidades de stock ni reservas. Sólo se validará que la variante continúe marcada
  como disponible en el catálogo al iniciar el pago.
- Mercado Pago será la acción primaria. WhatsApp permanecerá como enlace secundario para consultas y
  coordinación, pero no vaciará el carrito ni marcará pedidos como pagados.
- El checkout puede apagarse desde Decap CMS sin tocar código (`public/data/checkout.json`).
- El aviso de venta nueva al comercio es la notificación nativa de la app de Mercado Pago; BLAK no
  envía emails.
- El titular de la venta todavía no está definido. Sus datos viven en `public/data/seller.json`
  (editable desde Decap) con valores provisorios, y el checkout productivo queda bloqueado hasta
  confirmarlo.
- Se incorporan los requisitos legales mínimos de comercio electrónico en Argentina: botón de
  arrepentimiento, términos y condiciones, política de privacidad y datos del vendedor visibles.

## Evoluciones futuras acordadas

- Incorporar envío cuando estén definidos alcance geográfico, proveedor logístico y cálculo de costo.
- Evaluar stock numérico y reserva transaccional si aumenta el volumen de ventas.
- Evaluar medios de pago en efectivo.
- Evaluar email transaccional propio.

## Fuera de alcance inicial

- Registro y login de compradores.
- Historial de compras para clientes.
- Tarjetas guardadas por BLAK.
- Suscripciones o cobros recurrentes.
- Facturación electrónica automática con ARCA. Se factura manualmente y se registra la referencia en
  el panel.
- Cualquier modalidad de envío, dirección de entrega o cotización logística.
- Envío automático de emails desde BLAK.
- Reembolsos iniciados desde el panel interno; se gestionan en Mercado Pago.
- Stock numérico y reserva de unidades.

## Criterio de finalización

La funcionalidad estará terminada cuando una compra de prueba y una compra productiva controlada
puedan recorrer el flujo completo, el webhook deje el pedido con el estado correcto, ninguna
credencial privada llegue al frontend, los escenarios de aceptación de la especificación funcional
estén verificados y el consumo quede dentro de los planes gratuitos.
