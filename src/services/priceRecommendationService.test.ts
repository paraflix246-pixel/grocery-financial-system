import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aggregateFrequentItems,
  buildCheapestStoreRecommendation,
  buildCommunityRecommendations,
  buildPersonalRecommendations,
  getLastPaidForItem,
  mergePriceQuotes,
  type PriceQuote,
  type ReceiptItemRow,
} from '@/src/services/priceRecommendationLogic';

const resolveCanonical = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('egg')) return 'Eggs';
  if (lower.includes('milk')) return 'Lactose Free Milk';
  return undefined;
};

const sampleItems: ReceiptItemRow[] = [
  { name: 'Large Eggs 12ct', price: 4.99, quantity: 1, storeName: 'Walmart', receiptDate: '2026-06-01' },
  { name: 'Eggs', price: 3.49, quantity: 2, storeName: 'Aldi', receiptDate: '2026-06-10' },
  { name: 'Eggs', price: 4.29, quantity: 1, storeName: 'Target', receiptDate: '2026-06-15' },
  { name: 'Lactose Free Milk', price: 5.99, quantity: 1, storeName: 'Walmart', receiptDate: '2026-06-05' },
  { name: 'Lactose Free Milk', price: 5.49, quantity: 1, storeName: 'Target', receiptDate: '2026-06-12' },
];

describe('aggregateFrequentItems', () => {
  it('groups by canonical name and ranks by purchase count', () => {
    const frequent = aggregateFrequentItems(sampleItems, resolveCanonical, 5);
    assert.equal(frequent[0].canonicalName, 'Eggs');
    assert.equal(frequent[0].purchaseCount, 4);
    assert.equal(frequent[1].canonicalName, 'Lactose Free Milk');
    assert.equal(frequent[1].purchaseCount, 2);
  });

  it('skips payment fee and promo junk receipt lines', () => {
    const withFees: ReceiptItemRow[] = [
      ...sampleItems,
      {
        name: 'CHARGE PYMT D68 QTY 1',
        price: 4.06,
        quantity: 1,
        storeName: 'Walmart',
        receiptDate: '2026-06-20',
        lineKind: 'fee',
      },
      {
        name: 'BREAD ONLY',
        price: 0,
        quantity: 1,
        storeName: 'Walmart',
        receiptDate: '2026-06-20',
        lineKind: 'other',
      },
    ];
    const frequent = aggregateFrequentItems(withFees, resolveCanonical, 5);
    assert.ok(!frequent.some((item) => /charge\s+pymt/i.test(item.name)));
    assert.ok(!frequent.some((item) => item.name === 'BREAD ONLY'));
  });
});

describe('getLastPaidForItem', () => {
  it('returns most recent purchase for canonical item', () => {
    const lastPaid = getLastPaidForItem(sampleItems, 'Eggs', resolveCanonical);
    assert.ok(lastPaid);
    assert.equal(lastPaid.store, 'Target');
    assert.equal(lastPaid.price, 4.29);
    assert.equal(lastPaid.date, '2026-06-15');
  });
});

describe('mergePriceQuotes', () => {
  it('keeps lowest price per store and sorts ascending', () => {
    const merged = mergePriceQuotes(
      [
        { itemName: 'Eggs', storeName: 'Walmart', price: 4.99, date: '2026-06-01', source: 'receipt' },
        { itemName: 'Eggs', storeName: 'Aldi', price: 3.49, date: '2026-06-10', source: 'receipt' },
      ],
      [
        { itemName: 'Eggs', storeName: 'Walmart', price: 3.99, date: '2026-06-11', source: 'community' },
        { itemName: 'Eggs', storeName: 'Costco', price: 3.29, date: '2026-06-12', source: 'api' },
      ]
    );

    assert.deepEqual(
      merged.map((q) => q.storeName),
      ['Costco', 'Aldi', 'Walmart']
    );
    assert.equal(merged[2].price, 3.99);
  });
});

describe('buildCheapestStoreRecommendation', () => {
  it('computes savings vs last paid price', () => {
    const quotes: PriceQuote[] = [
      { itemName: 'Eggs', storeName: 'Aldi', price: 3.49, date: '2026-06-10', source: 'receipt' },
      { itemName: 'Eggs', storeName: 'Target', price: 4.29, date: '2026-06-15', source: 'receipt' },
    ];
    const lastPaid = { price: 4.29, store: 'Target', date: '2026-06-15' };
    const rec = buildCheapestStoreRecommendation('Eggs', quotes, lastPaid);

    assert.ok(rec);
    assert.equal(rec.cheapestStore, 'Aldi');
    assert.ok(rec.savingsVsLastPaid != null && Math.abs(rec.savingsVsLastPaid - 0.8) < 0.001);
  });
});

describe('buildPersonalRecommendations', () => {
  it('suggests cheaper store from user multi-store history', () => {
    const frequent = aggregateFrequentItems(sampleItems, resolveCanonical, 5);
    const recs = buildPersonalRecommendations(frequent, sampleItems, resolveCanonical, 2, 5);

    assert.ok(recs.some((r) => r.itemName === 'Eggs' && r.storeName === 'Aldi'));
    assert.ok(recs[0].savingsVsLastPaid != null && recs[0].savingsVsLastPaid > 0);
  });
});

describe('buildCommunityRecommendations', () => {
  it('builds community deal rows when community quotes exist', () => {
    const quotesByItem = new Map<string, PriceQuote[]>([
      [
        'eggs',
        [
          { itemName: 'Eggs', storeName: 'Aldi', price: 3.29, date: '2026-06-12', source: 'community' },
          { itemName: 'Eggs', storeName: 'Walmart', price: 4.99, date: '2026-06-01', source: 'receipt' },
        ],
      ],
    ]);
    const lastPaidByItem = new Map([
      ['eggs', { price: 4.29, store: 'Target', date: '2026-06-15' }],
    ]);

    const recs = buildCommunityRecommendations(['Eggs'], quotesByItem, lastPaidByItem, 3);
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, 'community');
    assert.equal(recs[0].storeName, 'Aldi');
  });
});
