import { describe, expect, it } from 'vitest';
import {
  activeTierFor,
  discountAmountFor,
  discountedUnitPrice,
  nextTierFor,
  normalizeTiers,
} from './volume-discount';

const tiers = normalizeTiers([
  { minQuantity: 24, discountPercent: 20 },
  { minQuantity: 5, discountPercent: 10 },
  { minQuantity: 12, discountPercent: 15 },
]);

describe('volume discount', () => {
  it('ordena los tramos y descarta los inválidos', () => {
    expect(tiers.map((tier) => tier.minQuantity)).toEqual([5, 12, 24]);
    expect(
      normalizeTiers([
        { minQuantity: 1, discountPercent: 10 },
        { minQuantity: 5, discountPercent: 0 },
        { minQuantity: 5, discountPercent: 100 },
        { minQuantity: 'x', discountPercent: 10 },
        null,
      ]),
    ).toEqual([]);
    expect(normalizeTiers('nada')).toEqual([]);
  });

  it('aplica el tramo más alto alcanzado', () => {
    expect(activeTierFor(tiers, 4)).toBeNull();
    expect(activeTierFor(tiers, 5)?.discountPercent).toBe(10);
    expect(activeTierFor(tiers, 11)?.discountPercent).toBe(10);
    expect(activeTierFor(tiers, 12)?.discountPercent).toBe(15);
    expect(activeTierFor(tiers, 30)?.discountPercent).toBe(20);
  });

  it('indica el próximo tramo', () => {
    expect(nextTierFor(tiers, 0)?.minQuantity).toBe(5);
    expect(nextTierFor(tiers, 5)?.minQuantity).toBe(12);
    expect(nextTierFor(tiers, 24)).toBeNull();
  });

  it('calcula el descuento en pesos enteros', () => {
    expect(discountAmountFor(100_000, null)).toBe(0);
    expect(discountAmountFor(99_999, tiers[1])).toBe(15_000);
    expect(discountedUnitPrice(25_000, tiers[0])).toBe(22_500);
  });
});
