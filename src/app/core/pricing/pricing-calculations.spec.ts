import { describe, expect, it } from 'vitest';
import { CostItem, QuoteInput } from '../models/cost-management.model';
import { calculateGrossMargin, calculateQuote, calculateUnitCost } from './pricing-calculations';

const cost: CostItem = {
  id: 'clasica',
  productName: 'Remera clásica BLAK',
  category: 'Catálogo',
  garmentCost: 12_000,
  printingCost: 2_000,
  designCostPerUnit: 500,
  labelsCost: 250,
  packagingCost: 750,
  otherUnitCost: 0,
  regularPrice: 30_000,
  notes: '',
  updatedAt: '2026-10-26T00:00:00.000Z',
};

const quote: QuoteInput = {
  costItemId: cost.id,
  quantity: 20,
  listPrice: 30_000,
  discountRate: 0,
  extraUnitCost: 0,
  designSetupCost: 10_000,
  shippingCost: 5_000,
  otherFixedCosts: 0,
  paymentFeeRate: 0.03,
  taxRate: 0.05,
  targetMarginRate: 0.4,
  minimumMarginRate: 0.3,
  depositRate: 0.5,
};

describe('pricing calculations', () => {
  it('sums every unit cost component', () => {
    expect(calculateUnitCost(cost)).toBe(15_500);
    expect(calculateGrossMargin(cost)).toBeCloseTo(0.483333, 5);
  });

  it('calculates a quote from displayed inputs', () => {
    const result = calculateQuote(quote, cost);

    expect(result.customerTotal).toBe(600_000);
    expect(result.fixedCosts).toBe(15_000);
    expect(result.estimatedTotalCost).toBe(373_000);
    expect(result.estimatedProfit).toBe(227_000);
    expect(result.saleMarginRate).toBeCloseTo(0.378333, 5);
    expect(result.targetUnitPrice).toBeCloseTo(31_250, 3);
    expect(result.minimumUnitPrice).toBeCloseTo(26_209.6774, 3);
    expect(result.requestedDeposit).toBe(300_000);
    expect(result.evaluation).toBe('below-target');
  });

  it('leaves required prices unavailable when rates consume the whole sale', () => {
    const result = calculateQuote({ ...quote, targetMarginRate: 0.95 }, cost);
    expect(result.targetUnitPrice).toBeNull();
  });
});
