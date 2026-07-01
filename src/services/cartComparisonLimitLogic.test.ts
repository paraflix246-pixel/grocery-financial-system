import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ListItem } from '@/src/models/types';
import {
  applyCartComparisonItemLimit,
  applyCartComparisonStoreRowLimit,
  FREE_CART_COMPARISON_ITEM_LIMIT,
  FREE_CART_COMPARISON_STORE_LIMIT,
  getCartComparisonStoreRowLimit,
  shouldShowCartComparisonUpgradeBanner,
  shouldShowLimitedComparisonMeta,
  shouldShowLimitedStoreComparisonMeta,
  shouldShowStoreComparisonUpgradeCard,
} from '@/src/services/cartComparisonLimitLogic';

function makeItem(id: string, name: string): ListItem {
  return {
    id,
    listId: 'list-1',
    name,
    expectedPrice: 0,
    quantity: 1,
    category: 'Groceries',
    sortOrder: 0,
  };
}

describe('applyCartComparisonStoreRowLimit', () => {
  it('returns all rows when user has full access', () => {
    const rows = [
      { store: 'Aldi', price: 2, isCheapest: true },
      { store: 'Kroger', price: 3, isCheapest: false },
      { store: 'Target', price: 4, isCheapest: false },
      { store: 'Costco', price: 5, isCheapest: false },
      { store: 'Walmart', price: 6, isCheapest: false },
    ];
    const result = applyCartComparisonStoreRowLimit(rows, true);
    assert.equal(result.length, 5);
  });

  it('limits free users to two stores and keeps cheapest visible', () => {
    const rows = [
      { store: 'Aldi', price: 2, isCheapest: true },
      { store: 'Kroger', price: 3, isCheapest: false },
      { store: 'Target', price: 4, isCheapest: false },
      { store: 'Costco', price: 5, isCheapest: false },
      { store: 'Walmart', price: 6, isCheapest: false },
    ];
    const result = applyCartComparisonStoreRowLimit(rows, false);
    assert.equal(result.length, FREE_CART_COMPARISON_STORE_LIMIT);
    assert.equal(result[0]!.store, 'Aldi');
    assert.ok(result.some((row) => row.store === 'Kroger'));
    assert.ok(!result.some((row) => row.store === 'Walmart'));
  });

  it('does not limit when free user already has two or fewer stores', () => {
    const rows = [
      { store: 'Aldi', price: 2, isCheapest: true },
      { store: 'Kroger', price: 3, isCheapest: false },
    ];
    const result = applyCartComparisonStoreRowLimit(rows, false);
    assert.equal(result.length, 2);
  });
});

describe('shouldShowLimitedStoreComparisonMeta', () => {
  it('shows when free user has more stores than preview cap', () => {
    assert.equal(shouldShowLimitedStoreComparisonMeta(false, 5), true);
  });

  it('hides when store count fits preview cap', () => {
    assert.equal(shouldShowLimitedStoreComparisonMeta(false, 2), false);
  });

  it('hides for full access users', () => {
    assert.equal(shouldShowLimitedStoreComparisonMeta(true, 5), false);
  });
});

describe('shouldShowStoreComparisonUpgradeCard', () => {
  it('shows when free user sees two stores but more exist', () => {
    assert.equal(shouldShowStoreComparisonUpgradeCard(false, 5, 2), true);
  });

  it('shows when exactly one store is hidden', () => {
    assert.equal(shouldShowStoreComparisonUpgradeCard(false, 3, 2), true);
  });

  it('hides when all stores are visible', () => {
    assert.equal(shouldShowStoreComparisonUpgradeCard(false, 2, 2), false);
  });

  it('hides for full access users', () => {
    assert.equal(shouldShowStoreComparisonUpgradeCard(true, 5, 2), false);
  });
});

describe('getCartComparisonStoreRowLimit', () => {
  it('returns null for full access users', () => {
    assert.equal(getCartComparisonStoreRowLimit(true), null);
  });

  it('returns free store cap for limited users', () => {
    assert.equal(getCartComparisonStoreRowLimit(false), FREE_CART_COMPARISON_STORE_LIMIT);
  });
});

describe('applyCartComparisonItemLimit', () => {
  it('returns all items when user has full access', () => {
    const items = [makeItem('1', 'Milk'), makeItem('2', 'Bread'), makeItem('3', 'Eggs')];
    const result = applyCartComparisonItemLimit(items, true);
    assert.equal(result.itemsForComparison.length, 3);
    assert.equal(result.totalListItemCount, 3);
    assert.equal(result.comparisonLimit, null);
  });

  it('limits free users to two rotating comparisons', () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      makeItem(String(index), `Item ${index + 1}`)
    );
    const result = applyCartComparisonItemLimit(items, false);
    assert.equal(result.itemsForComparison.length, FREE_CART_COMPARISON_ITEM_LIMIT);
    assert.equal(result.totalListItemCount, 8);
    assert.equal(result.comparisonLimit, FREE_CART_COMPARISON_ITEM_LIMIT);
  });

  it('pads short free lists up to the preview minimum', () => {
    const result = applyCartComparisonItemLimit([makeItem('1', 'Milk')], false);
    assert.equal(result.itemsForComparison.length, FREE_CART_COMPARISON_ITEM_LIMIT);
    assert.equal(result.totalListItemCount, 1);
    assert.equal(result.comparisonLimit, FREE_CART_COMPARISON_ITEM_LIMIT);
  });
});

describe('shouldShowLimitedComparisonMeta', () => {
  it('shows when free list exceeds preview cap', () => {
    assert.equal(shouldShowLimitedComparisonMeta(false, 2, 8), true);
  });

  it('hides when list fits preview cap', () => {
    assert.equal(shouldShowLimitedComparisonMeta(false, 2, 2), false);
  });

  it('hides for full access users', () => {
    assert.equal(shouldShowLimitedComparisonMeta(true, null, 8), false);
  });
});

describe('shouldShowCartComparisonUpgradeBanner', () => {
  it('shows when free list exceeds preview cap', () => {
    assert.equal(
      shouldShowCartComparisonUpgradeBanner({
        hasFullAccess: false,
        comparisonLimit: 2,
        totalListItemCount: 8,
        comparisonsCount: 2,
      }),
      true
    );
  });

  it('shows for short free lists once comparisons load', () => {
    assert.equal(
      shouldShowCartComparisonUpgradeBanner({
        hasFullAccess: false,
        comparisonLimit: 2,
        totalListItemCount: 1,
        comparisonsCount: 2,
      }),
      true
    );
  });

  it('hides for full access users', () => {
    assert.equal(
      shouldShowCartComparisonUpgradeBanner({
        hasFullAccess: true,
        comparisonLimit: null,
        totalListItemCount: 8,
        comparisonsCount: 2,
      }),
      false
    );
  });
});
