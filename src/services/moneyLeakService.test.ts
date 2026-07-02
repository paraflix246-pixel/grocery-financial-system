import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildMoneyLeakReport } from './moneyLeakService';
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
    status: 'ok',
    statusLabel: 'OK',
    quantityLabel: '1 gal',
    lowStockThreshold: 1,
    effectiveShelfLifeDays: 7,
    daysUntilExpiry: 5,
    ...overrides,
  } as PantryItemView;
}

describe('buildMoneyLeakReport', () => {
  it('returns empty report when no data exists', () => {
    const report = buildMoneyLeakReport({
      pantryItems: [],
      listItems: [],
      receipts: [],
    });
    assert.equal(report.hasData, false);
    assert.equal(report.blindSpotCount, 0);
    assert.equal(report.estimatedAtRisk, null);
  });

  it('flags pantry-list overlap and estimates cost from receipts', () => {
    const report = buildMoneyLeakReport({
      pantryItems: [pantryItem({ name: 'Eggs', daysUntilExpiry: null, status: 'ok' })],
      listItems: [
        {
          id: 'l1',
          listId: 'list1',
          name: 'Eggs',
          expectedPrice: 4,
          quantity: 1,
          category: 'Dairy',
          sortOrder: 0,
        },
      ],
      receipts: [
        {
          id: 'r1',
          storeName: 'Kroger',
          date: '2026-06-25',
          total: 4,
          imageUri: '',
          userCorrected: false,
          createdAt: '2026-06-25',
          updatedAt: '2026-06-25',
          items: [{ id: 'i1', receiptId: 'r1', name: 'Eggs', price: 4, quantity: 1 }],
        },
      ],
    });

    assert.ok(report.blindSpots.some((spot) => spot.kind === 'overlap'));
    assert.equal(report.blindSpotCount, 1);
    assert.equal(report.estimatedAtRisk, 4);
  });

  it('counts expiring pantry items as blind spots', () => {
    const report = buildMoneyLeakReport({
      pantryItems: [pantryItem({ daysUntilExpiry: 2, status: 'expiring_soon' })],
      listItems: [],
      receipts: [{ id: 'r1', storeName: 'Kroger', date: '2026-06-20', total: 10, imageUri: '', userCorrected: false, createdAt: '2026-06-20', updatedAt: '2026-06-20' }],
      now: new Date('2026-06-30T12:00:00Z'),
    });

    assert.ok(report.blindSpots.some((spot) => spot.kind === 'expiring'));
    assert.equal(report.blindSpotCount, 1);
  });

  it('does not invent dollar totals without receipt prices', () => {
    const report = buildMoneyLeakReport({
      pantryItems: [pantryItem({ name: 'Spinach', daysUntilExpiry: 1, status: 'expiring_soon' })],
      listItems: [],
      receipts: [],
    });

    assert.equal(report.estimatedAtRisk, null);
    assert.ok(report.blindSpotCount > 0);
  });
});
