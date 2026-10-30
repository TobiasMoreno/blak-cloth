# Especificación funcional

## 1. Alcance

Se reemplazará el cierre principal por WhatsApp por un checkout de invitado con Mercado Pago. El
carrito continuará siendo editable hasta que el cliente inicie el pago y sólo se vaciará después de
que el backend confirme una operación aprobada.

## 2. Actores

- **Comprador:** selecciona productos, informa sus datos, revisa la modalidad de retiro y paga.
- **Administrador BLAK:** consulta pedidos, marca el avance del retiro y registra la factura desde
  `/gestion`.
- **Mercado Pago:** procesa el cobro, notifica cambios de estado y avisa al comercio de cada venta
  desde su app.
- **Backend BLAK (Netlify Functions):** valida precios, crea preferencias, recibe webhooks y mantiene
  los pedidos.

## 3. Datos solicitados al comprador

### Siempre obligatorios

- Nombre.
- Apellido.
- Email.
- Teléfono o WhatsApp.
- Aceptación de términos y condiciones y política de privacidad (casilla sin marcar por defecto).

La primera versión ofrece únicamente retiro, por lo que no solicita dirección ni permite elegir un
tipo de entrega. El lugar o zona de retiro se informará antes de iniciar el pago y la coordinación
final podrá realizarse por WhatsApp.

### Datos que BLAK no solicitará

- Número de tarjeta.
- Código de seguridad.
- Contraseña de Mercado Pago.
- Credenciales bancarias.
- DNI, salvo que una futura necesidad fiscal o logística lo vuelva obligatorio.

## 4. Flujo principal

1. El comprador revisa los artículos del carrito.
2. Completa sus datos de contacto y acepta los términos.
3. La interfaz muestra subtotal, descuento mayorista, total a pagar y lugar de retiro.
4. El comprador activa `Pagar con Mercado Pago`.
5. BLAK valida los campos y solicita al backend la creación del checkout, enviando el total que el
   comprador está viendo.
6. El backend vuelve a calcular precios, descuento y total con el catálogo publicado.
7. Si el total difiere del que vio el comprador, el backend no crea nada y devuelve los precios
   nuevos; la interfaz los muestra y pide confirmar (ver 6.1).
8. El backend registra un pedido pendiente en Firestore.
9. El backend crea una preferencia en Mercado Pago y devuelve su URL de checkout.
10. El navegador redirige al comprador a Mercado Pago en la misma pestaña.
11. Mercado Pago procesa o deja pendiente el pago.
12. Mercado Pago redirige al comprador a `/checkout/result` de BLAK.
13. La pantalla consulta al backend; no confía en el estado incluido en la URL de retorno.
14. Mercado Pago envía un webhook y el backend verifica la operación contra su API.
15. Cuando el pago queda aprobado, el pedido cambia a `paid` y el carrito asociado se limpia.
16. El administrador ve el pedido pagado, coordina el retiro y lo marca como retirado.

## 5. Estados visibles

### Estado del pago

| Estado interno | Mensaje para el comprador | Acción principal |
|---|---|---|
| `checkout_pending` | Preparando el pago | Esperar |
| `payment_pending` | El pago está pendiente | Volver a consultar |
| `paid` | Pago confirmado | Ver resumen / coordinar retiro |
| `rejected` | No pudimos aprobar el pago | Reintentar pago |
| `cancelled` | El pago fue cancelado | Volver al carrito |
| `expired` | El link de pago venció | Volver al carrito |
| `refunded` | El pago fue devuelto | Contactar soporte |
| `disputed` | El pago tiene un reclamo abierto | Contactar soporte |
| `charged_back` | El pago fue desconocido en la tarjeta | Contactar soporte |
| `review_required` | Estamos revisando tu pago | Contactar soporte |
| `checkout_error` | No pudimos iniciar el pago | Reintentar sin perder el carrito |

`review_required` aparece cuando Mercado Pago informa un pago que no coincide con el pedido (monto,
moneda, vendedor o entorno distintos). Nunca se trata como pagado.

### Estado del retiro (sólo pedidos `paid`)

| Estado | Significado |
|---|---|
| `pending` | Pagado, falta preparar |
| `ready` | Listo para retirar |
| `picked_up` | Retirado por el comprador |

## 6. Reglas de negocio

- La moneda será ARS.
- El backend ignorará cualquier precio, subtotal, descuento o total enviado por el navegador como
  fuente de verdad; el total enviado sólo sirve para detectar diferencias.
- Los precios se obtendrán del catálogo publicado en Firebase Hosting.
- El descuento mayorista se recalculará con la configuración publicada.
- El descuento se aplica por unidad y se redondea a pesos enteros por unidad. El total es la suma de
  los precios unitarios ya descontados por su cantidad. La misma regla se usa en el carrito y en el
  backend, así el total mostrado siempre coincide con el cobrado.
- El máximo por combinación producto/talle/color continuará siendo 50 unidades; un pedido admite como
  máximo 30 líneas.
- Sólo se podrá comprar una variante marcada como disponible.
- La primera versión no mantendrá cantidades de stock, no reservará unidades y no descontará stock
  después del pago.
- Se acepta el riesgo de que una variante marcada como disponible pueda agotarse antes de una
  actualización manual del catálogo. Si ocurre, el comercio devuelve el dinero desde Mercado Pago.
- No se vaciará el carrito al crear la preferencia ni al volver desde Mercado Pago.
- El carrito se vaciará al verificar que el pedido asociado está `paid`.
- Un pago rechazado o un error de red no eliminará productos ni datos ingresados.
- Un pedido rechazado puede volver a pagarse con el mismo link mientras no venza. Si después se
  aprueba, el pedido pasa a `paid`.
- El link de pago vence a las 2 horas. Un pedido sin pago a las 2 horas pasa a `expired`.
- Medios aceptados: tarjetas de crédito y débito, dinero en cuenta y Mercado Crédito. Sin efectivo.
- Cuotas: hasta 6, con el interés a cargo del comprador según lo que ofrezca Mercado Pago.
- Los pedidos `payment_pending` no se prepararán ni entregarán como pagados.
- El administrador no podrá marcar manualmente un pedido como pagado; sólo puede cambiar el estado
  del retiro y registrar la factura.
- Si un mismo pedido recibe dos pagos aprobados, o el mismo comprador paga dos pedidos idénticos en
  24 horas, el pedido se marca como posible duplicado en el panel y el comercio devuelve el sobrante
  desde Mercado Pago.
- Los reembolsos se hacen desde Mercado Pago; el webhook refleja el nuevo estado. Un reembolso
  parcial deja el pedido en `paid` y muestra el monto devuelto.
- No se mostrará una comisión separada de Mercado Pago al comprador.

### 6.1 Cambio de precio entre carrito y checkout

- Si el total recalculado difiere del enviado, o una variante dejó de estar disponible, no se crea el
  pedido.
- La interfaz actualiza los precios del carrito, señala qué cambió y muestra el total nuevo.
- El comprador debe volver a activar `Pagar con Mercado Pago` para confirmar.
- Las variantes no disponibles quedan marcadas y deben quitarse antes de continuar.

## 7. Retiro y evolución futura de envío

La primera versión permite únicamente retiro:

- El costo de entrega es cero y Mercado Pago cobra el total completo de la mercadería.
- No se solicita ni almacena una dirección de entrega.
- El lugar o zona de retiro se edita desde Decap CMS y se muestra antes de iniciar el pago.
- Si el lugar exacto todavía debe coordinarse, se informa expresamente antes del pago.
- Cualquier modalidad de envío queda fuera del alcance y se incorporará en una evolución futura.

## 8. WhatsApp

- El botón primario será `Pagar con Mercado Pago`.
- Se conservará `Consultar por WhatsApp` como acción secundaria.
- Abrir WhatsApp no creará una venta, no cambiará estados y no vaciará el carrito.
- En la confirmación pagada se mostrará un enlace para coordinar el retiro con el número de pedido.
- Si el checkout está apagado desde el CMS, WhatsApp vuelve a ser la acción primaria y se informa que
  el pago online no está disponible por el momento.

## 9. Gestión interna

Se agregará una vista de pedidos dentro de `/gestion`, protegida por la autenticación administrativa
existente.

La lista mostrará:

- Fecha.
- Número de pedido (código corto, p. ej. `BLK-7Q2K9M`).
- Comprador.
- Total.
- Estado del pago.
- Estado del retiro.
- Marca de posible duplicado o revisión requerida.

Filtros: pagados sin retirar, pendientes, todos.

El detalle mostrará:

- Artículos, talle, color, cantidad y precio capturado al comprar.
- Subtotal, descuento, total y monto reembolsado si existe.
- Datos de contacto y lugar de retiro.
- Identificadores de Mercado Pago necesarios para conciliación.
- Por cada pago: medio de pago, cuotas, comisión cobrada por Mercado Pago, neto recibido y fecha en
  que el dinero queda disponible, tal como los informa Mercado Pago.
- Historial básico de cambios de estado.

Acciones permitidas:

- Cambiar el estado del retiro (`pending` → `ready` → `picked_up`, con posibilidad de volver atrás).
- Registrar la referencia de la factura emitida manualmente en ARCA.

No se puede cambiar el estado del pago desde el panel.

También se listarán las solicitudes del botón de arrepentimiento (ver 10).

## 10. Requisitos legales (Argentina)

- **Botón de arrepentimiento** (Res. SCI 424/2020): enlace visible en el pie de todas las páginas
  hacia `/arrepentimiento`. El formulario pide nombre, email, número de pedido y motivo opcional, y
  devuelve en pantalla un código de solicitud. Las solicitudes quedan en el panel de gestión.
- **Términos y condiciones** en `/terminos`: condiciones de compra, retiro, devolución, plazo de
  arrepentimiento de 10 días corridos, medios de pago.
- **Política de privacidad** en `/privacidad`: qué datos se piden, para qué, cuánto se conservan y
  cómo pedir su eliminación (Ley 25.326).
- **Datos del vendedor** en el pie: nombre o razón social, CUIT, domicilio y email de contacto.
- **Facturación:** cada venta se factura manualmente en ARCA y su referencia se carga en el panel.

Los textos de términos y privacidad y los datos del vendedor están en
[Textos legales](./legal-texts.md). El checkout productivo no se publica hasta completar los
pendientes de ese documento.

## 11. Accesibilidad y experiencia

- El formulario será reactivo y tendrá etiquetas visibles.
- Los errores estarán asociados con `aria-describedby`/`aria-errormessage` y serán anunciados.
- Al fallar la validación, el foco irá al primer campo inválido.
- Durante la creación del checkout se bloquearán solicitudes duplicadas y se anunciará el estado
  ocupado.
- Ante un cambio de precio, el resumen se anuncia en una región viva y el foco va al aviso.
- Las páginas de resultado moverán el foco al título principal después de resolver el estado.
- Los estados no dependerán sólo del color.
- Toda la funcionalidad será operable con teclado y deberá superar AXE sin violaciones.

## 12. Escenarios de aceptación

### Checkout de invitado

- **CUANDO** una persona sin sesión completa los datos válidos y paga **ENTONCES** puede finalizar
  la compra sin crear una cuenta BLAK.
- **CUANDO** falta un dato obligatorio o no aceptó los términos **ENTONCES** no se crea el pedido, se
  informa el error y el foco se mueve al primer campo inválido.
- **CUANDO** se muestra el checkout **ENTONCES** la única modalidad disponible es retiro y no se
  solicita dirección.
- **CUANDO** el checkout está apagado desde el CMS **ENTONCES** no se muestra el botón de pago y el
  backend rechaza nuevas creaciones.

### Integridad del precio

- **CUANDO** el navegador envía un precio o descuento modificado **ENTONCES** el backend lo ignora y
  usa catálogo y reglas vigentes.
- **CUANDO** una variante ya no está disponible **ENTONCES** no se crea la preferencia, se marca la
  variante y el carrito se conserva.
- **CUANDO** cambió un precio desde que se armó el carrito **ENTONCES** se informa el cambio y se pide
  confirmación antes de redirigir.
- **CUANDO** el carrito muestra un total con descuento mayorista **ENTONCES** Mercado Pago cobra
  exactamente ese total.

### Pago

- **CUANDO** se crea una preferencia correctamente **ENTONCES** existe primero un pedido pendiente
  relacionado mediante `external_reference`.
- **CUANDO** el comprador vuelve con `status=approved` en la URL pero el backend no verificó el pago
  **ENTONCES** la interfaz no muestra una confirmación definitiva.
- **CUANDO** el webhook válido corresponde al monto y pedido esperado **ENTONCES** el estado se
  actualiza de forma idempotente.
- **CUANDO** el pago informado no coincide en monto, moneda, vendedor o entorno **ENTONCES** el
  pedido queda `review_required` y no se muestra como pagado.
- **CUANDO** el mismo webhook llega más de una vez **ENTONCES** no se duplican pedidos, cobros ni
  transiciones.
- **CUANDO** un pago se rechaza y el comprador reintenta con éxito en el mismo link **ENTONCES** el
  pedido queda `paid`.
- **CUANDO** el pago queda aprobado **ENTONCES** se muestra la confirmación y se limpia el carrito
  asociado.
- **CUANDO** el pago falla, se rechaza o se cancela **ENTONCES** el carrito permanece disponible.
- **CUANDO** pasan 2 horas sin pago **ENTONCES** el pedido figura `expired` y el link ya no permite
  pagar.
- **CUANDO** el pago es reembolsado totalmente **ENTONCES** el pedido refleja `refunded`; si es
  parcial, sigue `paid` con el monto devuelto.
- **CUANDO** el comprador vuelve en otro navegador sin el token local **ENTONCES** ve un mensaje
  genérico con el número de pedido y el enlace de WhatsApp, sin datos personales.

### Seguridad y privacidad

- **CUANDO** se inspecciona el bundle Angular **ENTONCES** no contiene Access Token, secreto de
  webhook ni credenciales administrativas de Firebase.
- **CUANDO** un comprador intenta consultar otro pedido sin su token **ENTONCES** recibe una respuesta
  no autorizada sin datos personales.
- **CUANDO** un origen no autorizado llama una Function desde un navegador **ENTONCES** no recibe
  autorización CORS.
- **CUANDO** una notificación tiene firma inválida **ENTONCES** no modifica Firestore.
- **CUANDO** una IP supera el límite de intentos **ENTONCES** recibe `429` sin crear pedidos.

### Gestión

- **CUANDO** el administrador autorizado abre pedidos **ENTONCES** puede listar, filtrar y consultar
  el detalle.
- **CUANDO** el administrador marca un pedido pagado como retirado **ENTONCES** el cambio queda en el
  historial y el estado del pago no cambia.
- **CUANDO** el administrador intenta cambiar el retiro de un pedido no pagado **ENTONCES** se
  rechaza.
- **CUANDO** una persona no autorizada intenta acceder **ENTONCES** no obtiene datos de pedidos.

### Legal

- **CUANDO** una persona envía el formulario de arrepentimiento **ENTONCES** recibe un código en
  pantalla y la solicitud aparece en el panel.
- **CUANDO** se navega cualquier página **ENTONCES** el pie muestra el botón de arrepentimiento, los
  datos del vendedor y los enlaces a términos y privacidad.
