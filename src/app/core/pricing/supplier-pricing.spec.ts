import { describe, expect, it } from 'vitest';
import { Supplier, SupplierOffer } from '../models/cost-management.model';
import { calculateSupplierOfferPrice } from './supplier-pricing';

const offer: SupplierOffer = {
  id: 'chomba-adulto',
  productName: 'Chomba mujer/hombre',
  category: 'Chombas',
  variant: '',
  baseUnitPrice: 20_000,
  minimumQuantity: 20,
  shippingCost: 0,
  taxIncluded: false,
  useSupplierPricing: true,
  pricingRules: [],
  quotedAt: '2026-10-29',
  validUntil: '',
  notes: '',
  updatedAt: '2026-10-29T00:00:00.000Z',
};

const supplier: Supplier = {
  id: 'fabrica-casuales',
  name: 'Fábrica Casuales',
  contactName: '',
  phone: '',
  email: '',
  instagram: '@fabricacasuales',
  website: 'https://casualesbasics.com.ar',
  location: 'Buenos Aires',
  catalogUrl: '',
  paymentTerms: '',
  leadTimeDays: 0,
  minimumQuantity: 20,
  pricingRules: [
    { minQuantity: 20, mode: 'discount-rate', value: 0.05 },
    { minQuantity: 60, mode: 'discount-rate', value: 0.1 },
    { minQuantity: 120, mode: 'discount-rate', value: 0.15 },
  ],
  offers: [offer],
  notes: '',
  updatedAt: '2026-10-29T00:00:00.000Z',
};

describe('supplier pricing', () => {
  it('applies percentage tiers from the supplier catalogue', () => {
    expect(calculateSupplierOfferPrice(supplier, offer, 20).unitPrice).toBe(19_000);
    expect(calculateSupplierOfferPrice(supplier, offer, 60).unitPrice).toBe(18_000);
    expect(calculateSupplierOfferPrice(supplier, offer, 120).unitPrice).toBe(17_000);
  });

  it('supports a final unit price supplied for a product', () => {
    const result = calculateSupplierOfferPrice(
      supplier,
      {
        ...offer,
        useSupplierPricing: false,
        pricingRules: [{ minQuantity: 50, mode: 'unit-price', value: 16_250 }],
      },
      50,
    );

    expect(result.unitPrice).toBe(16_250);
    expect(result.discountRate).toBeCloseTo(0.1875);
  });

  it('includes shipping in the comparable effective cost', () => {
    const result = calculateSupplierOfferPrice(
      supplier,
      { ...offer, shippingCost: 10_000 },
      20,
    );

    expect(result.shippingPerUnit).toBe(500);
    expect(result.effectiveUnitPrice).toBe(19_500);
    expect(result.totalCost).toBe(390_000);
  });
});
