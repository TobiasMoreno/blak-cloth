import { describe, expect, it } from 'vitest';
import { parseWorkspace } from './cost-management.store';

describe('cost management workspace migrations', () => {
  it('opens a version 1 workspace with an empty supplier directory', () => {
    const workspace = parseWorkspace({
      schemaVersion: 1,
      revision: 4,
      updatedAt: '2026-10-20T00:00:00.000Z',
      costs: [],
      quoteDefaults: {},
    });

    expect(workspace.schemaVersion).toBe(2);
    expect(workspace.revision).toBe(4);
    expect(workspace.suppliers).toEqual([]);
  });

  it('normalizes supplier pricing rules from a version 2 workspace', () => {
    const workspace = parseWorkspace({
      schemaVersion: 2,
      revision: 1,
      updatedAt: '2026-10-29T00:00:00.000Z',
      costs: [],
      quoteDefaults: {},
      suppliers: [
        {
          id: 'casuales',
          name: 'Fábrica Casuales',
          minimumQuantity: 20,
          pricingRules: [
            { minQuantity: 20, mode: 'discount-rate', value: 0.05 },
            { minQuantity: 60, mode: 'unit-price', value: 18_000 },
          ],
          offers: [],
        },
      ],
    });

    expect(workspace.suppliers[0]?.minimumQuantity).toBe(20);
    expect(workspace.suppliers[0]?.pricingRules).toEqual([
      { minQuantity: 20, mode: 'discount-rate', value: 0.05 },
      { minQuantity: 60, mode: 'unit-price', value: 18_000 },
    ]);
  });
});
