import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getStarterCommonGoods, pickStarterItemNames, STARTER_ITEM_POOL } from '@/src/data/starterCommonGoods';
import {
  areStarterItemsFullyHidden,
  buildStarterTrackedEntries,
  shouldShowStarterTrackedItems,
} from '@/src/services/starterItemsLogic';

describe('shouldShowStarterTrackedItems', () => {
  it('shows starters for brand-new users with no data', () => {
    assert.equal(shouldShowStarterTrackedItems([], [], {}), true);
  });

  it('hides starters once receipts exist', () => {
    assert.equal(
      shouldShowStarterTrackedItems(
        [],
        [{ name: 'Milk', price: 3, quantity: 1, storeName: 'Aldi', receiptDate: '2026-06-01' }],
        {}
      ),
      false
    );
  });

  it('hides starters when price alerts are enabled', () => {
    assert.equal(
      shouldShowStarterTrackedItems(
        [{ id: 'r1', itemName: 'Eggs', canonicalName: 'Eggs' }],
        [],
        {}
      ),
      false
    );
  });

  it('hides starters when user dismissed the sample set globally', () => {
    assert.equal(shouldShowStarterTrackedItems([], [], { startersDismissed: true }), false);
  });

  it('still shows starters when only some sample items were hidden individually', () => {
    assert.equal(shouldShowStarterTrackedItems([], [], {}), true);
  });
});

describe('starter common goods', () => {
  it('returns stable seeded starter names', () => {
    const first = pickStarterItemNames(STARTER_ITEM_POOL, 4, 'test-seed');
    const second = pickStarterItemNames(STARTER_ITEM_POOL, 4, 'test-seed');
    assert.deepEqual(first, second);
    assert.equal(first.length, 4);
  });

  it('builds starter tracked entries with starter source', () => {
    const entries = buildStarterTrackedEntries(['Eggs', 'Bread'], new Set(), () => undefined);
    assert.equal(entries.length, 2);
    assert.ok(entries.every((entry) => entry.source === 'starter'));
  });

  it('filters individually hidden starter items without blocking the rest', () => {
    const entries = buildStarterTrackedEntries(
      ['Eggs', 'Bread', 'Milk'],
      new Set(['eggs']),
      () => undefined
    );
    assert.deepEqual(
      entries.map((entry) => entry.name),
      ['Bread', 'Milk']
    );
  });

  it('detects when every starter item was hidden', () => {
    assert.equal(
      areStarterItemsFullyHidden(['Eggs', 'Bread'], new Set(['eggs', 'bread']), () => undefined),
      true
    );
    assert.equal(
      areStarterItemsFullyHidden(['Eggs', 'Bread'], new Set(['eggs']), () => undefined),
      false
    );
  });

  it('getStarterCommonGoods returns eight common grocery names by default', () => {
    const items = getStarterCommonGoods();
    assert.equal(items.length, 8);
    assert.ok(items.every((item) => item.source === 'starter'));
  });
});
