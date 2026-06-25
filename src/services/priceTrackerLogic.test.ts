import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildRecentReceiptTrackedEntries,
  buildTrackedItems,
  type ReceiptItemRow,
  type TrackedItemRule,
} from '@/src/services/priceTrackerLogic';

const resolveCanonical = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('egg')) return 'Eggs';
  if (lower.includes('bread')) return 'Bread';
  if (lower.includes('orange juice')) return 'Orange Juice';
  return undefined;
};

const hidden = new Set(['bread']);

const rules: TrackedItemRule[] = [
  {
    id: 'rule-eggs',
    itemName: 'Large Eggs',
    canonicalName: 'Eggs',
    emoji: '🥚',
  },
  {
    id: 'rule-bread',
    itemName: 'Bread',
    canonicalName: 'Bread',
    emoji: '🍞',
  },
];

const receiptItems: ReceiptItemRow[] = [
  {
    name: 'Whole Wheat Bread',
    price: 3.29,
    quantity: 1,
    storeName: 'Aldi',
    receiptDate: '2026-06-15',
  },
  {
    name: 'Orange Juice 64oz',
    price: 4.99,
    quantity: 1,
    storeName: 'Target',
    receiptDate: '2026-06-14',
  },
  {
    name: 'Large Eggs 12ct',
    price: 3.49,
    quantity: 1,
    storeName: 'Walmart',
    receiptDate: '2026-06-13',
  },
];

describe('buildTrackedItems', () => {
  it('prefers alert rules over receipt history and respects hidden keys', () => {
    const tracked = buildTrackedItems(rules, receiptItems, hidden, resolveCanonical);
    assert.deepEqual(
      tracked.map((item) => item.name),
      ['Eggs', 'Orange Juice']
    );
    assert.equal(tracked[0].source, 'alert');
    assert.equal(tracked[1].source, 'receipt');
  });

  it('fills from receipts when alert rules are absent', () => {
    const tracked = buildTrackedItems([], receiptItems, new Set(), resolveCanonical);
    assert.ok(tracked.length >= 2);
    assert.equal(tracked.every((item) => item.source === 'receipt'), true);
  });

  it('deduplicates receipt items by canonical name', () => {
    const duplicates: ReceiptItemRow[] = [
      ...receiptItems,
      {
        name: 'Orange Juice 64oz',
        price: 5.49,
        quantity: 1,
        storeName: 'Kroger',
        receiptDate: '2026-06-10',
      },
    ];
    const tracked = buildTrackedItems([], duplicates, new Set(), resolveCanonical);
    const juiceEntries = tracked.filter((item) => item.name === 'Orange Juice');
    assert.equal(juiceEntries.length, 1);
  });
});

describe('buildRecentReceiptTrackedEntries', () => {
  it('uses only items from the most recent receipt and dedupes by canonical name', () => {
    const items: ReceiptItemRow[] = [
      {
        name: 'Whole Wheat Bread',
        price: 3.29,
        quantity: 1,
        storeName: 'Aldi',
        receiptDate: '2026-06-15',
      },
      {
        name: 'Orange Juice 64oz',
        price: 4.99,
        quantity: 1,
        storeName: 'Target',
        receiptDate: '2026-06-15',
      },
      {
        name: 'Orange Juice 64oz',
        price: 5.49,
        quantity: 1,
        storeName: 'Kroger',
        receiptDate: '2026-06-15',
      },
      {
        name: 'Large Eggs 12ct',
        price: 3.49,
        quantity: 1,
        storeName: 'Walmart',
        receiptDate: '2026-06-10',
      },
    ];

    const tracked = buildRecentReceiptTrackedEntries(items, new Set(), resolveCanonical);
    assert.deepEqual(
      tracked.map((item) => item.name),
      ['Bread', 'Orange Juice']
    );
    assert.equal(tracked.every((item) => item.source === 'receipt'), true);
  });
});
