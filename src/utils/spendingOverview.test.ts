import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Receipt } from '@/src/models/types';
import {
  buildSpendingOverviewBreakdown,
  getSpendingOverviewReceipts,
  hasReceiptsOutsideSpendingPeriod,
} from '@/src/utils/spendingOverview';
import { getPeriodDateRange } from '@/src/utils/spendingPeriodAnalytics';

function receipt(partial: Partial<Receipt> & Pick<Receipt, 'id' | 'date' | 'storeName' | 'total'>): Receipt {
  return {
    imageUri: '',
    userCorrected: false,
    items: [],
    createdAt: partial.date,
    updatedAt: partial.date,
    ...partial,
  };
}

describe('getSpendingOverviewReceipts', () => {
  it('filters receipts for the selected month period', () => {
    const now = new Date('2026-06-19T12:00:00');
    const receipts = [
      receipt({
        id: '1',
        date: '2026-06-08',
        storeName: 'Walmart',
        total: 561.62,
      }),
      receipt({
        id: '2',
        date: '2026-05-30',
        storeName: 'Target',
        total: 42,
      }),
    ];

    const result = getSpendingOverviewReceipts(receipts, 'month', now);
    assert.equal(result.periodLabel, 'This Month');
    assert.equal(result.receipts.length, 1);
    assert.equal(result.receipts[0]?.id, '1');
  });

  it('filters receipts for the selected week period', () => {
    const now = new Date('2026-06-19T12:00:00');
    const { start, end } = getPeriodDateRange('week', now);
    const receipts = [
      receipt({ id: '1', date: start, storeName: 'Walmart', total: 100 }),
      receipt({ id: '2', date: '2026-06-08', storeName: 'Target', total: 42 }),
    ];

    const result = getSpendingOverviewReceipts(receipts, 'week', now);
    assert.equal(result.periodLabel, 'This Week');
    assert.equal(result.receipts.length, 1);
    assert.equal(result.receipts[0]?.id, '1');
  });
});

describe('hasReceiptsOutsideSpendingPeriod', () => {
  it('returns true when receipts exist but none match the selected period', () => {
    const now = new Date('2026-07-01T12:00:00');
    const receipts = [
      receipt({ id: '1', date: '2026-03-23', storeName: 'Walmart', total: 15.95 }),
    ];
    assert.equal(hasReceiptsOutsideSpendingPeriod(receipts, 'month', now), true);
    assert.equal(hasReceiptsOutsideSpendingPeriod(receipts, 'year', now), false);
  });
});

describe('buildSpendingOverviewBreakdown', () => {
  it('maps receipt totals without line items into Groceries', () => {
    const breakdown = buildSpendingOverviewBreakdown([
      receipt({ id: '1', date: '2026-06-08', storeName: 'Walmart', total: 50 }),
    ]);

    assert.equal(breakdown.find((entry) => entry.category === 'Groceries')?.amount, 50);
  });

  it('classifies common receipt items into spending categories', () => {
    const breakdown = buildSpendingOverviewBreakdown([
      receipt({
        id: '1',
        date: '2026-06-08',
        storeName: 'Walmart',
        total: 100,
        items: [
          { id: 'a', receiptId: '1', name: 'MILK 2 GAL', price: 7.86, quantity: 1 },
          { id: 'b', receiptId: '1', name: 'PAPER TOWELS', price: 12, quantity: 1 },
          { id: 'c', receiptId: '1', name: 'POTATO CHIPS', price: 10, quantity: 1 },
        ],
      }),
    ]);

    assert.equal(breakdown.find((entry) => entry.category === 'Groceries')?.amount, 7.86);
    assert.equal(breakdown.find((entry) => entry.category === 'Household')?.amount, 12);
    assert.equal(breakdown.find((entry) => entry.category === 'Snacks')?.amount, 10);
  });
});
