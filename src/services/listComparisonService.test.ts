import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GroceryList, Receipt } from '@/src/models/types';
import { pickComparisonListId, receiptRowsFromReceipts } from '@/src/services/listComparisonLogic';

function makeList(id: string, updatedAt: string, isActive = false): GroceryList {
  return {
    id,
    name: `List ${id}`,
    isActive,
    layoutMode: 'category',
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('pickComparisonListId', () => {
  it('prefers active list when it has items', () => {
    const active = makeList('active', '2026-06-21T12:00:00Z', true);
    const other = makeList('other', '2026-06-21T13:00:00Z');
    const id = pickComparisonListId([other, active], active, {
      active: 2,
      other: 5,
    });
    assert.equal(id, 'active');
  });

  it('falls back to most recent non-empty list when active is empty', () => {
    const active = makeList('active', '2026-06-21T14:00:00Z', true);
    const recent = makeList('recent', '2026-06-21T13:00:00Z');
    const older = makeList('older', '2026-06-21T10:00:00Z');
    const id = pickComparisonListId([active, recent, older], active, {
      active: 0,
      recent: 3,
      older: 1,
    });
    assert.equal(id, 'recent');
  });

  it('returns null when every list is empty', () => {
    const active = makeList('active', '2026-06-21T12:00:00Z', true);
    const id = pickComparisonListId([active], active, { active: 0 });
    assert.equal(id, null);
  });

  it('uses first non-empty list when no active list is set', () => {
    const recent = makeList('recent', '2026-06-21T13:00:00Z');
    const id = pickComparisonListId([recent], null, { recent: 2 });
    assert.equal(id, 'recent');
  });
});

describe('receiptRowsFromReceipts', () => {
  it('flattens receipt line items with store metadata, newest receipts first', () => {
    const rows = receiptRowsFromReceipts([
      {
        id: 'r-old',
        storeName: 'Kroger',
        date: '2026-03-10',
        total: 8.5,
        imageUri: '',
        userCorrected: false,
        createdAt: '2026-03-10',
        updatedAt: '2026-03-10',
        items: [{ id: 'i-old', receiptId: 'r-old', name: 'Eggs', price: 3.49, quantity: 1 }],
      } satisfies Receipt,
      {
        id: 'r1',
        storeName: 'Walmart',
        date: '2026-03-23',
        total: 15.95,
        imageUri: '',
        userCorrected: false,
        createdAt: '2026-03-23',
        updatedAt: '2026-03-23',
        items: [
          { id: 'i1', receiptId: 'r1', name: 'Milk', price: 3.5, quantity: 1 },
          { id: 'i2', receiptId: 'r1', name: 'Bread', price: 2.25, quantity: 2 },
        ],
      } satisfies Receipt,
    ]);

    assert.equal(rows.length, 3);
    assert.equal(rows[0]?.name, 'Milk');
    assert.equal(rows[0]?.storeName, 'Walmart');
    assert.equal(rows[0]?.receiptDate, '2026-03-23');
    assert.equal(rows[2]?.name, 'Eggs');
  });
});
