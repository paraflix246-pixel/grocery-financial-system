import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPantryInsights } from './pantryInsightService';
import type { PantryItemView } from './pantryService';

function pantryItem(overrides: Partial<PantryItemView>): PantryItemView {
  return {
    id: 'p1',
    name: 'Milk',
    quantity: 1,
    unit: 'gal',
    category: 'Dairy',
    addedDate: '2026-06-28',
    canonicalName: 'Milk',
    emoji: '🥛',
    status: 'expiring_soon',
    statusLabel: 'Expiring soon',
    quantityLabel: '1 gal',
    lowStockThreshold: 1,
    effectiveShelfLifeDays: 3,
    daysUntilExpiry: 2,
    ...overrides,
  } as PantryItemView;
}

describe('buildPantryInsights', () => {
  it('flags items expiring within 3 days', () => {
    const cards = buildPantryInsights({
      pantryItems: [pantryItem({ daysUntilExpiry: 2 })],
      receipts: [],
      now: new Date('2026-06-30T12:00:00Z'),
    });
    assert.ok(cards.some((card) => card.id === 'expiry-risk'));
  });

  it('detects repeat purchases', () => {
    const cards = buildPantryInsights({
      pantryItems: [],
      receipts: [
        {
          id: 'r1',
          storeName: 'Kroger',
          date: '2026-06-20',
          total: 10,
          items: [{ name: 'Eggs', price: 3, quantity: 1 }],
        },
        {
          id: 'r2',
          storeName: 'Kroger',
          date: '2026-06-22',
          total: 10,
          items: [{ name: 'Eggs', price: 3, quantity: 1 }],
        },
        {
          id: 'r3',
          storeName: 'Kroger',
          date: '2026-06-25',
          total: 10,
          items: [{ name: 'Eggs', price: 3, quantity: 1 }],
        },
      ],
    });
    assert.ok(cards.some((card) => card.id === 'repeat-purchase'));
  });
});
