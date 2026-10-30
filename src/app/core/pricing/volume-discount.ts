/** Un tramo de public/data/wholesale.json: desde cierta cantidad, todo el pedido tiene ese descuento. */
export interface VolumeTier {
  minQuantity: number;
  discountPercent: number;
}

/** Descarta tramos mal cargados en el CMS y los ordena de menor a mayor cantidad. */
export function normalizeTiers(raw: unknown): VolumeTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tier) => ({
      minQuantity: Math.floor(Number(tier?.minQuantity)),
      discountPercent: Number(tier?.discountPercent),
    }))
    .filter(
      (tier) =>
        Number.isFinite(tier.minQuantity) &&
        tier.minQuantity > 1 &&
        Number.isFinite(tier.discountPercent) &&
        tier.discountPercent > 0 &&
        tier.discountPercent < 100,
    )
    .sort((a, b) => a.minQuantity - b.minQuantity);
}

/** El tramo más alto que alcanza la cantidad, o null si todavía no llega al primero. */
export function activeTierFor(tiers: VolumeTier[], units: number): VolumeTier | null {
  return [...tiers].reverse().find((tier) => units >= tier.minQuantity) ?? null;
}

export function nextTierFor(tiers: VolumeTier[], units: number): VolumeTier | null {
  return tiers.find((tier) => units < tier.minQuantity) ?? null;
}

/** Redondeado a pesos enteros, que es como se cobra. */
export function discountAmountFor(subtotal: number, tier: VolumeTier | null): number {
  return tier ? Math.round((subtotal * tier.discountPercent) / 100) : 0;
}

export function discountedUnitPrice(price: number, tier: VolumeTier): number {
  return Math.round(price * (1 - tier.discountPercent / 100));
}
