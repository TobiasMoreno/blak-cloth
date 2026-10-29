/**
 * Datos de compra que se muestran en el detalle y en el carrito.
 * Los campos en `null` no se muestran: completarlos cuando estén confirmados.
 */
export const STORE_INFO = {
  city: 'Córdoba',
  payment: 'Transferencia bancaria',
  /** Dirección o zona de retiro, p. ej. "Nueva Córdoba, a coordinar". */
  pickupLocation: null as string | null,
  /** Zona de envío, p. ej. "Córdoba capital". */
  shippingArea: null as string | null,
  /** Costo de envío, p. ej. "Desde $3.000 según la zona". */
  shippingCost: null as string | null,
  /** Medidas por talle en cm (ancho de pecho × largo). Vacío: se ofrece consultar por WhatsApp. */
  sizeChart: [] as { size: string; chest: number; length: number }[]
};
