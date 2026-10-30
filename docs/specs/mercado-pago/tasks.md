# Plan de implementación

Las tareas están ordenadas por dependencia. Cada bloque debe quedar verificado antes de avanzar al
siguiente.

## 0. Cerrar decisiones

- [x] Primera versión únicamente con retiro; envío postergado.
- [x] Sin stock numérico ni reservas; validar solamente disponibilidad de variante.
- [x] Conservar WhatsApp como consulta secundaria.
- [x] Absorber la comisión de Mercado Pago en el precio publicado.
- [x] Firebase Hosting como única web pública; Netlify sólo para Functions.
- [x] Sólo planes gratuitos; sin Background/Scheduled Functions ni Cloud Functions.
- [x] Sin efectivo; hasta 6 cuotas con interés a cargo del comprador; link válido por 2 horas.
- [x] Descuento mayorista por unidad con redondeo por unidad, compartido entre carrito y backend.
- [x] Catálogo leído desde Firebase Hosting por las Functions.
- [x] Webhooks configurados en el panel de Mercado Pago, sin `notification_url`.
- [x] Interruptor del checkout y lugar de retiro en `public/data/checkout.json` (Decap).

## 1. Preparar Mercado Pago

- [ ] Crear o seleccionar la aplicación de Mercado Pago del comercio.
- [ ] Seleccionar Checkout Pro con Preferences API.
- [ ] Crear cuentas de prueba (vendedor y comprador) y obtener credenciales de prueba.
- [ ] Obtener el `collector_id` (user ID) de la cuenta vendedora.
- [ ] Configurar el webhook de prueba (evento `payment`) y obtener su secreto.
- [ ] Verificar que la cuenta no tenga cuotas sin interés activadas.
- [ ] Elegir el plazo de acreditación en la cuenta del comercio.
- [ ] Activar las notificaciones de venta en la app de Mercado Pago del comercio.

## 2. Prerrequisitos en el repositorio

- [ ] Resolver el loader de imágenes que apunta a `/.netlify/images` en Firebase Hosting.
- [ ] Agregar `Cache-Control: no-cache` a `/data/**` en `firebase.json`.
- [ ] Crear `public/data/checkout.json` y su colección en Decap CMS.
- [ ] Reemplazar `STORE_INFO.pickupLocation` por `checkout.json`.
- [ ] Unificar el pricing por unidad en `src/app/core/pricing/` sin dependencias de Angular y ajustar
      `CartService` y sus pruebas.

## 3. Infraestructura backend (Netlify sólo-API)

- [ ] Reescribir `netlify.toml` como sitio sólo-API con `ignore` por rutas.
- [ ] Crear `netlify/static/index.html` mínimo y `netlify/functions/` con `tsconfig` propio.
- [ ] Agregar SDK oficial de Mercado Pago y `firebase-admin`.
- [ ] Crear una service account con rol `Cloud Datastore User`.
- [ ] Crear cargador tipado y validado de configuración/secretos.
- [ ] Implementar lector de catálogo remoto con timeout y caché de 60 s.
- [ ] Implementar allowlist CORS por entorno.
- [ ] Implementar respuestas, errores y correlation ID compartidos.
- [ ] Implementar logging estructurado sin PII.
- [ ] Implementar rate limit en Firestore y política TTL de `rateLimits`.
- [ ] Documentar variables necesarias sin incluir valores reales.
- [ ] Quitar el handler de auth de `blakstreetwear.netlify.app` si deja de usarse.

## 4. Dominio de pedidos

- [ ] Definir tipos TypeScript para pedido, pago, cliente, retiro, pricing y estados.
- [ ] Implementar la precedencia de estados a partir de múltiples pagos.
- [ ] Implementar vencimiento perezoso.
- [ ] Implementar generación de IDs, códigos cortos y tokens opacos.
- [ ] Guardar solamente el hash del token de consulta.
- [ ] Implementar repositorio Firestore con transacciones y timestamps del servidor.
- [ ] Agregar índices de pedidos.
- [ ] Extender reglas para negar `orders`, `withdrawalRequests` y `rateLimits` a clientes.
- [ ] Agregar pruebas unitarias y de emulador.

## 5. Pricing autoritativo

- [ ] Resolver productos y variantes desde el catálogo remoto.
- [ ] Validar variante disponible, cantidad entre 1 y 50 y como máximo 30 líneas.
- [ ] Usar el pricing compartido.
- [ ] Fijar costo de entrega en cero y rechazar modalidades distintas de retiro.
- [ ] Rechazar productos inexistentes, precios inválidos o carrito vacío.
- [ ] Comparar con `expectedTotal` y construir la respuesta `CATALOG_CHANGED`.
- [ ] Cubrir precios, descuentos, redondeo y límites con pruebas.

## 6. Crear checkout

- [ ] Implementar `create-checkout`.
- [ ] Validar el formulario completo y la versión de términos en backend.
- [ ] Respetar `mercadoPagoEnabled`.
- [ ] Implementar idempotencia por `clientRequestId` con hash del body.
- [ ] Crear el pedido antes de llamar a Mercado Pago.
- [ ] Crear la preferencia según la sección 2.1 de la especificación técnica.
- [ ] Persistir preference ID, checkout URL y vencimiento.
- [ ] Manejar timeout/error del proveedor con `checkout_error`.
- [ ] Probar duplicados, conflictos, cambios de catálogo y fallos parciales.

## 7. Webhook y estados

- [ ] Implementar `mercado-pago-webhook` sincrónico.
- [ ] Ignorar con `200` los tópicos que no son `payment`.
- [ ] Validar firma oficial.
- [ ] Consultar el pago mediante la API de Mercado Pago.
- [ ] Verificar referencia, vendedor, entorno, moneda y monto; marcar `mismatch`.
- [ ] Aplicar pagos en transacción con idempotencia por `dateLastUpdated`.
- [ ] Guardar comisión, neto, fecha de acreditación, medio de pago y cuotas de cada pago.
- [ ] Detectar pagos duplicados y pedidos duplicados.
- [ ] Registrar historial acotado de estados.
- [ ] Responder `500` ante fallas transitorias.
- [ ] Probar firma inválida, duplicados, eventos desordenados, rechazo seguido de aprobación,
      reembolso parcial y mediación.

## 8. Consulta segura del pedido

- [ ] Implementar `order-status`.
- [ ] Verificar token por hash y comparación segura.
- [ ] Devolver únicamente el resumen mínimo.
- [ ] Implementar sincronización acotada con `payments/search`.
- [ ] Probar acceso a pedido ajeno y ausencia de PII.

## 9. Checkout Angular

- [ ] Crear modelos y servicio HTTP tipados.
- [ ] Configurar `apiBaseUrl` por entorno sin secretos.
- [ ] Migrar datos del comprador y la aceptación de términos a Reactive Forms.
- [ ] Mantener señales sólo para estado de UI derivado.
- [ ] Eliminar la elección y los campos de envío del checkout inicial.
- [ ] Mostrar el lugar de retiro desde `checkout.json`.
- [ ] Reemplazar la acción primaria por `Pagar con Mercado Pago`, respetando el interruptor.
- [ ] Implementar el flujo de cambio de precio.
- [ ] Implementar loading, prevención de doble creación de checkout y errores recuperables.
- [ ] Persistir las entradas `blak-checkouts` con límite y vencimiento.
- [ ] Conservar WhatsApp como consulta secundaria sin efectos sobre pedido o carrito.
- [ ] Actualizar pruebas actuales del carrito.
- [ ] Agregar pruebas de accesibilidad.

## 10. Resultado Angular

- [ ] Agregar ruta lazy `/checkout/result`.
- [ ] Consultar el estado real mediante `order-status`.
- [ ] Implementar polling con backoff y límite.
- [ ] Diseñar vistas para todos los estados de la especificación funcional.
- [ ] Limpiar del carrito sólo los artículos del pedido al confirmar `paid`.
- [ ] Mostrar el estado genérico cuando falta el token local.
- [ ] Gestionar foco y anuncios accesibles.
- [ ] Probar retorno manipulado y token ausente.

## 11. Gestión interna

- [ ] Implementar verificación de Firebase ID token en Netlify.
- [ ] Documentar que la allowlist vive en `firestore.rules` y en `ADMIN_EMAIL_ALLOWLIST`.
- [ ] Implementar listado paginado y filtrado de pedidos.
- [ ] Implementar detalle de pedido con estado efectivo.
- [ ] Implementar `admin-order-update` para retiro y referencia de factura.
- [ ] Agregar rutas lazy `/gestion/pedidos` y `/gestion/arrepentimientos`.
- [ ] Mostrar marcas de duplicado y revisión requerida.
- [ ] Mostrar comisión, neto y fecha de acreditación de cada pago en el detalle.
- [ ] Probar administrador autorizado, acceso rechazado y actualización sobre pedido no pagado.

## 12. Legal

- [ ] Implementar `withdrawal-request` y la página `/arrepentimiento`.
- [x] Redactar textos legales y obtener datos del vendedor (`legal-texts.md`).
- [ ] Agregar páginas `/terminos` y `/privacidad` con los textos de `legal-texts.md`.
- [ ] Agregar al pie el botón de arrepentimiento, datos del vendedor y enlaces legales.
- [ ] Completar los pendientes del comercio de `legal-texts.md`.
- [ ] Documentar la facturación manual en ARCA.
- [ ] Crear el script de anonimización de datos personales.

## 13. Validación integral

- [ ] Ejecutar tests unitarios del repositorio y de las Functions.
- [ ] Ejecutar build productivo de Angular.
- [ ] Ejecutar AXE sobre carrito, resultados, gestión y páginas legales.
- [ ] Probar teclado y foco.
- [ ] Ejecutar la matriz manual de la especificación técnica.
- [ ] Verificar que el bundle no contiene secretos.
- [ ] Verificar Firestore y logs sin datos sensibles innecesarios.
- [ ] Verificar que Netlify no compila ante cambios sólo de frontend o catálogo.
- [ ] Verificar uso dentro de los planes gratuitos.

## 14. Producción

- [ ] Configurar credenciales productivas en el contexto `production` de Netlify.
- [ ] Configurar el webhook productivo y obtener su secreto.
- [ ] Confirmar las URLs HTTPS de retorno de Firebase Hosting.
- [ ] Confirmar datos fiscales y costos en la cuenta Mercado Pago.
- [ ] Publicar textos legales y datos del vendedor, con revisión profesional e inscripción en la
      AAIP completas.
- [ ] Habilitar `mercadoPagoEnabled` desde Decap.
- [ ] Ejecutar compra real controlada.
- [ ] Conciliar bruto, comisión, impuestos y neto, y comparar la comisión real con `comisiones.md`.
- [ ] Verificar pedido en `/gestion/pedidos` y marcarlo retirado.
- [ ] Escribir `docs/runbooks/checkout.md`.
- [ ] Probar el rollback apagando y volviendo a encender el checkout.

## 15. Seguimiento posterior

- [ ] Revisar errores y conversiones después de las primeras ventas.
- [ ] Revisar consumo de cuotas gratuitas semanalmente durante el lanzamiento.
- [ ] Evaluar email transaccional.
- [ ] Evaluar medios de pago en efectivo.
- [ ] Evaluar stock numérico y reservas.
- [ ] Evaluar costo automático de envío.
- [ ] Evaluar cuentas opcionales e historial de compras.
