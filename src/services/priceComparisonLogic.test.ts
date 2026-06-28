import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyExternalQuoteToStorePrice,
  buildAlignedStoreRows,
  getDisplayedPriceSpread,
  getItemPriceSpreadSavings,
  getSavingsSubtitleForStoreRows,
  shouldApplyExternalQuote,
  type ComparableStorePrice,
} from '@/src/services/priceComparisonLogic';

const storeNames = ['Aldi', 'Kroger', 'Target', 'Walmart'];

describe('buildAlignedStoreRows', () => {
  it('aligns the same item across all catalog stores and sorts by price', () => {
    const prices: ComparableStorePrice[] = [
      { store: 'Aldi', price: 2.99, source: 'estimate' },
      { store: 'Walmart', price: 3.49, source: 'estimate' },
      { store: 'Target', price: 3.29, source: 'estimate' },
      { store: 'Kroger', price: 3.19, source: 'estimate' },
    ];

    const rows = buildAlignedStoreRows(storeNames, prices);

    assert.deepEqual(
      rows.map((row) => row.store),
      ['Aldi', 'Kroger', 'Target', 'Walmart']
    );
    assert.equal(rows[0].isCheapest, true);
    assert.equal(rows.filter((row) => row.isCheapest).length, 1);
  });

  it('marks tied cheapest stores', () => {
    const prices: ComparableStorePrice[] = [
      { store: 'Aldi', price: 2.99, source: 'estimate' },
      { store: 'Kroger', price: 2.99, source: 'history' },
      { store: 'Target', price: 3.49, source: 'estimate' },
    ];

    const rows = buildAlignedStoreRows(storeNames, prices);
    assert.equal(rows.filter((row) => row.isCheapest).length, 2);
  });

  it('marks cheapest among displayed stores when a lower off-catalog price exists', () => {
    const prices: ComparableStorePrice[] = [
      { store: 'Lidl', price: 2.5, source: 'history' },
      { store: 'Aldi', price: 2.79, source: 'estimate' },
      { store: 'Costco', price: 2.99, source: 'estimate' },
      { store: 'Kroger', price: 3.29, source: 'estimate' },
    ];

    const rows = buildAlignedStoreRows(['Aldi', 'Costco', 'Kroger'], prices);

    assert.equal(rows[0].store, 'Aldi');
    assert.equal(rows[0].isCheapest, true);
    assert.equal(rows.filter((row) => row.isCheapest).length, 1);
  });
});

describe('getItemPriceSpreadSavings', () => {
  it('computes spread savings for a single item quantity', () => {
    const rows = buildAlignedStoreRows(storeNames, [
      { store: 'Aldi', price: 2.99, source: 'estimate' },
      { store: 'Kroger', price: 3.19, source: 'estimate' },
      { store: 'Target', price: 3.29, source: 'estimate' },
      { store: 'Walmart', price: 3.49, source: 'estimate' },
    ]);

    assert.equal(getItemPriceSpreadSavings(rows, 1), 0.5);
    assert.equal(getItemPriceSpreadSavings(rows, 2), 1);
  });

  it('returns zero when fewer than two stores have prices', () => {
    const rows = buildAlignedStoreRows(storeNames, [
      { store: 'Aldi', price: 2.99, source: 'estimate' },
    ]);
    assert.equal(getItemPriceSpreadSavings(rows, 1), 0);
  });
});

describe('getSavingsSubtitleForStoreRows', () => {
  it('uses estimate copy when all visible rows are estimates', () => {
    const rows = buildAlignedStoreRows(storeNames, [
      { store: 'Aldi', price: 2.79, source: 'estimate' },
      { store: 'Kroger', price: 3.29, source: 'estimate' },
    ]);
    assert.equal(
      getSavingsSubtitleForStoreRows(rows),
      'Estimated prices — scan receipts or set ZIP for live data'
    );
  });

  it('uses live copy when any visible row is api', () => {
    const rows = buildAlignedStoreRows(storeNames, [
      { store: 'Aldi', price: 2.79, source: 'estimate' },
      { store: 'Kroger', price: 3.29, source: 'api' },
    ]);
    assert.equal(getSavingsSubtitleForStoreRows(rows), 'Live prices where available');
  });

  it('uses receipt copy for history-only visible rows', () => {
    const rows = buildAlignedStoreRows(storeNames, [
      { store: 'Aldi', price: 2.79, source: 'history' },
      { store: 'Kroger', price: 3.29, source: 'history' },
    ]);
    assert.equal(getSavingsSubtitleForStoreRows(rows), 'from your receipts');
  });
});

describe('getDisplayedPriceSpread', () => {
  it('returns cheapest and priciest displayed stores', () => {
    const rows = buildAlignedStoreRows(storeNames, [
      { store: 'Aldi', price: 2.79, source: 'estimate' },
      { store: 'Kroger', price: 3.29, source: 'estimate' },
    ]);
    const spread = getDisplayedPriceSpread(rows);
    assert.deepEqual(spread, {
      cheapestStore: 'Aldi',
      cheapestPrice: 2.79,
      priciestStore: 'Kroger',
      priciestPrice: 3.29,
    });
  });

  it('returns null when only one store is displayed', () => {
    const rows = buildAlignedStoreRows(storeNames, [
      { store: 'Aldi', price: 2.79, source: 'estimate' },
    ]);
    assert.equal(getDisplayedPriceSpread(rows), null);
  });
});

describe('shouldApplyExternalQuote', () => {
  it('always replaces static estimates with live api quotes', () => {
    assert.equal(
      shouldApplyExternalQuote({ store: 'Walmart', price: 4.99, source: 'estimate' }, { price: 5.47, source: 'api' }),
      true
    );
  });

  it('keeps receipt history unless api is cheaper', () => {
    assert.equal(
      shouldApplyExternalQuote({ store: 'Walmart', price: 4.5, source: 'history' }, { price: 5.47, source: 'api' }),
      false
    );
    assert.equal(
      shouldApplyExternalQuote({ store: 'Walmart', price: 6.0, source: 'history' }, { price: 5.47, source: 'api' }),
      true
    );
  });
});

describe('applyExternalQuoteToStorePrice', () => {
  it('promotes Walmart estimate to live api even when live price is higher', () => {
    const existing: ComparableStorePrice = { store: 'Walmart', price: 4.99, source: 'estimate' };
    applyExternalQuoteToStorePrice(existing, {
      price: 5.47,
      source: 'api',
      productLabel: 'Great Value Ground Beef 80/20, 1 lb',
    });

    assert.equal(existing.price, 5.47);
    assert.equal(existing.source, 'api');
    assert.equal(existing.productLabel, 'Great Value Ground Beef 80/20, 1 lb');
  });
});
