# Comisiones de Mercado Pago

Cuánto queda de cada venta cobrada con Checkout Pro en Córdoba, según el plazo de acreditación.

## Conclusión

**Pagar sin tarjeta de crédito no baja la comisión online.** En Checkout Pro, Mercado Pago cobra la
misma tasa con dinero en cuenta, débito, crédito, prepaga o Cuotas sin Tarjeta. El único factor que
cambia el costo es el plazo en que el dinero queda disponible.

La tasa baja de dinero en cuenta (0,80%) existe sólo cobrando en persona con QR.

## Tasas para Córdoba

Córdoba está en el grupo de Buenos Aires, Chubut y Entre Ríos, que tiene las tasas más altas. Vigentes
desde el 6 de marzo de 2026.

Mercado Pago cobra siempre el IVA (21%) sobre la comisión. BLAK es monotributista y no lo recupera,
así que el costo real es la tasa **con IVA**.

| Dinero disponible | Tasa | Con IVA (costo real) |
|---|---:|---:|
| Al instante | 6,60% | 7,99% |
| En 10 días | 4,61% | 5,58% |
| En 18 días | 3,56% | 4,31% |
| En 35 días | 1,56% | 1,89% |

## Ejemplos

### 1 remera · $30.000

| Dinero disponible | Comisión | Te queda |
|---|---:|---:|
| Al instante | $2.396 | $27.604 |
| En 10 días | $1.673 | $28.327 |
| En 18 días | $1.292 | $28.708 |
| En 35 días | $566 | $29.434 |

### 5 remeras con descuento mayorista (10%) · $135.000

| Dinero disponible | Comisión | Te queda |
|---|---:|---:|
| Al instante | $10.781 | $124.219 |
| En 10 días | $7.530 | $127.470 |
| En 18 días | $5.815 | $129.185 |
| En 35 días | $2.548 | $132.452 |

### 12 remeras con descuento mayorista (15%) · $306.000

| Dinero disponible | Comisión | Te queda |
|---|---:|---:|
| Al instante | $24.437 | $281.563 |
| En 10 días | $17.069 | $288.931 |
| En 18 días | $13.181 | $292.819 |
| En 35 días | $5.776 | $300.224 |

Fórmula: `comisión = monto × tasa × 1,21`; `te queda = monto − comisión`.

## Para tener en cuenta

- **Valores reales:** estas tablas son una estimación. Una vez implementado, cada pedido guarda la
  comisión y el neto que informa Mercado Pago para ese pago, y se ven en `/gestion/pedidos`.

- **Confirmar las tasas:** la tabla por provincia viene de una fuente de terceros revisada el
  23/10/2026; la página oficial sólo muestra las tasas de CABA. Las que te aplican figuran en la
  sección de costos de tu cuenta de Mercado Pago.
- **Retenciones:** no se incluyen Ingresos Brutos ni otras retenciones; dependen de tu inscripción y
  se descuentan aparte.
- **Monotributo:** la facturación anual se mide sobre el monto cobrado al comprador, no sobre el neto
  que queda después de la comisión.
- **Cuotas:** las cuotas con interés las paga el comprador y no cambian tu neto. Las cuotas sin
  interés sí te cuestan, y la spec no las ofrece.
- **Plazo:** se elige en la configuración de la cuenta y aplica a todas las ventas, no a cada una.
- **QR al retirar:** cobrar con QR en el momento del retiro sale 0,80% con dinero en cuenta y entre
  1,33% y 1,42% con débito (más IVA). La contra es que no tenés el pago confirmado antes de preparar
  el pedido.

## Fuentes

- [Mercado Pago: Checkout en tu sitio web](https://www.mercadopago.com.ar/herramientas-para-vender/check-out)
- [Calculadora Mercado Pago 2026 (DP Tienda Online)](https://dptiendaonline.com/calculadora-cuotas-sin-interes-mercado-pago/)
