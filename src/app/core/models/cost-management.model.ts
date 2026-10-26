export interface CostItem {
  id: string;
  productName: string;
  category: string;
  garmentCost: number;
  printingCost: number;
  designCostPerUnit: number;
  labelsCost: number;
  packagingCost: number;
  otherUnitCost: number;
  regularPrice: number;
  notes: string;
  updatedAt: string;
}

export interface QuoteDefaults {
  paymentFeeRate: number;
  taxRate: number;
  targetMarginRate: number;
  minimumMarginRate: number;
  depositRate: number;
}

export interface CostWorkspace {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  costs: CostItem[];
  quoteDefaults: QuoteDefaults;
}

export interface QuoteInput extends QuoteDefaults {
  costItemId: string;
  quantity: number;
  listPrice: number;
  discountRate: number;
  extraUnitCost: number;
  designSetupCost: number;
  shippingCost: number;
  otherFixedCosts: number;
}

export type QuoteEvaluation = 'invalid' | 'below-minimum' | 'below-target' | 'meets-target';

export interface QuoteResult {
  finalUnitPrice: number;
  customerTotal: number;
  variableUnitCost: number;
  fixedCosts: number;
  estimatedTotalCost: number;
  estimatedProfit: number;
  saleMarginRate: number | null;
  targetUnitPrice: number | null;
  minimumUnitPrice: number | null;
  requestedDeposit: number;
  balanceAfterDeposit: number;
  evaluation: QuoteEvaluation;
}

export const DEFAULT_QUOTE_DEFAULTS: QuoteDefaults = {
  paymentFeeRate: 0,
  taxRate: 0,
  targetMarginRate: 0.4,
  minimumMarginRate: 0.3,
  depositRate: 0.5,
};

export function createEmptyWorkspace(now: string): CostWorkspace {
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: now,
    costs: [],
    quoteDefaults: { ...DEFAULT_QUOTE_DEFAULTS },
  };
}

export function createQuoteInput(defaults: QuoteDefaults, cost?: CostItem): QuoteInput {
  return {
    ...defaults,
    costItemId: cost?.id ?? '',
    quantity: 1,
    listPrice: cost?.regularPrice ?? 0,
    discountRate: 0,
    extraUnitCost: 0,
    designSetupCost: 0,
    shippingCost: 0,
    otherFixedCosts: 0,
  };
}
