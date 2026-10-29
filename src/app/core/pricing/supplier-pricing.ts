import {
  Supplier,
  SupplierOffer,
  SupplierPricingRule,
} from '../models/cost-management.model';

export interface SupplierOfferPrice {
  eligible: boolean;
  minimumQuantity: number;
  appliedRule: SupplierPricingRule | null;
  unitPrice: number;
  discountRate: number | null;
  shippingPerUnit: number;
  effectiveUnitPrice: number;
  totalCost: number;
}

export function calculateSupplierOfferPrice(
  supplier: Supplier,
  offer: SupplierOffer,
  requestedQuantity: number,
): SupplierOfferPrice {
  const quantity = Math.max(1, Math.floor(finiteOrZero(requestedQuantity)));
  const minimumQuantity = Math.max(1, offer.minimumQuantity || supplier.minimumQuantity || 1);
  const rules = offer.useSupplierPricing ? supplier.pricingRules : offer.pricingRules;
  const appliedRule = applicableRule(rules, quantity);
  const baseUnitPrice = finiteOrZero(offer.baseUnitPrice);
  const unitPrice = priceForRule(baseUnitPrice, appliedRule);
  const shippingPerUnit = finiteOrZero(offer.shippingCost) / quantity;

  return {
    eligible: quantity >= minimumQuantity,
    minimumQuantity,
    appliedRule,
    unitPrice,
    discountRate:
      baseUnitPrice > 0 ? Math.max(0, (baseUnitPrice - unitPrice) / baseUnitPrice) : null,
    shippingPerUnit,
    effectiveUnitPrice: unitPrice + shippingPerUnit,
    totalCost: unitPrice * quantity + finiteOrZero(offer.shippingCost),
  };
}

export function applicableRule(
  rules: SupplierPricingRule[],
  quantity: number,
): SupplierPricingRule | null {
  return (
    [...rules]
      .filter((rule) => rule.minQuantity <= quantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0] ?? null
  );
}

function priceForRule(baseUnitPrice: number, rule: SupplierPricingRule | null): number {
  if (!rule) return baseUnitPrice;
  if (rule.mode === 'unit-price') return finiteOrZero(rule.value);
  return baseUnitPrice * (1 - Math.min(1, finiteOrZero(rule.value)));
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
