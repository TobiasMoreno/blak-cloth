import {
  CostItem,
  QuoteEvaluation,
  QuoteInput,
  QuoteResult,
} from '../models/cost-management.model';

export function calculateUnitCost(cost: CostItem): number {
  return sumNonNegative([
    cost.garmentCost,
    cost.printingCost,
    cost.designCostPerUnit,
    cost.labelsCost,
    cost.packagingCost,
    cost.otherUnitCost,
  ]);
}

export function calculateGrossMargin(cost: CostItem): number | null {
  if (cost.regularPrice <= 0) return null;
  return (cost.regularPrice - calculateUnitCost(cost)) / cost.regularPrice;
}

export function calculateQuote(input: QuoteInput, cost: CostItem | undefined): QuoteResult {
  const quantity = positiveOrZero(input.quantity);
  const listPrice = positiveOrZero(input.listPrice);
  const discountRate = boundedRate(input.discountRate);
  const paymentFeeRate = boundedRate(input.paymentFeeRate);
  const taxRate = boundedRate(input.taxRate);
  const targetMarginRate = boundedRate(input.targetMarginRate);
  const minimumMarginRate = boundedRate(input.minimumMarginRate);
  const depositRate = boundedRate(input.depositRate);

  const finalUnitPrice = listPrice * (1 - discountRate);
  const customerTotal = finalUnitPrice * quantity;
  const variableUnitCost =
    (cost ? calculateUnitCost(cost) : 0) + positiveOrZero(input.extraUnitCost);
  const fixedCosts = sumNonNegative([
    input.designSetupCost,
    input.shippingCost,
    input.otherFixedCosts,
  ]);
  const estimatedTotalCost =
    variableUnitCost * quantity + fixedCosts + customerTotal * (paymentFeeRate + taxRate);
  const estimatedProfit = customerTotal - estimatedTotalCost;
  const saleMarginRate = customerTotal > 0 ? estimatedProfit / customerTotal : null;
  const targetUnitPrice = calculateRequiredUnitPrice(
    quantity,
    variableUnitCost,
    fixedCosts,
    paymentFeeRate,
    taxRate,
    targetMarginRate,
  );
  const minimumUnitPrice = calculateRequiredUnitPrice(
    quantity,
    variableUnitCost,
    fixedCosts,
    paymentFeeRate,
    taxRate,
    minimumMarginRate,
  );
  const requestedDeposit = customerTotal * depositRate;

  return {
    finalUnitPrice,
    customerTotal,
    variableUnitCost,
    fixedCosts,
    estimatedTotalCost,
    estimatedProfit,
    saleMarginRate,
    targetUnitPrice,
    minimumUnitPrice,
    requestedDeposit,
    balanceAfterDeposit: customerTotal - requestedDeposit,
    evaluation: evaluateQuote(
      quantity,
      customerTotal,
      saleMarginRate,
      minimumMarginRate,
      targetMarginRate,
    ),
  };
}

function calculateRequiredUnitPrice(
  quantity: number,
  variableUnitCost: number,
  fixedCosts: number,
  paymentFeeRate: number,
  taxRate: number,
  marginRate: number,
): number | null {
  const denominator = 1 - paymentFeeRate - taxRate - marginRate;
  if (quantity <= 0 || denominator <= 0) return null;
  return (variableUnitCost + fixedCosts / quantity) / denominator;
}

function evaluateQuote(
  quantity: number,
  customerTotal: number,
  saleMarginRate: number | null,
  minimumMarginRate: number,
  targetMarginRate: number,
): QuoteEvaluation {
  if (quantity <= 0 || customerTotal <= 0 || saleMarginRate === null) return 'invalid';
  if (saleMarginRate < minimumMarginRate) return 'below-minimum';
  if (saleMarginRate < targetMarginRate) return 'below-target';
  return 'meets-target';
}

function boundedRate(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function positiveOrZero(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function sumNonNegative(values: number[]): number {
  return values.reduce((sum, value) => sum + positiveOrZero(value), 0);
}
