import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeRepurchaseCadences } from '@/src/utils/repurchaseCadence';

describe('computeRepurchaseCadences', () => {
  it('returns overdue items sorted by lateness ratio', () => {
    const results = computeRepurchaseCadences(
      [
        { canonicalName: 'Milk', displayName: 'Milk', receiptDate: '2026-05-01' },
        { canonicalName: 'Milk', displayName: 'Milk', receiptDate: '2026-05-08' },
        { canonicalName: 'Milk', displayName: 'Milk', receiptDate: '2026-05-15' },
        { canonicalName: 'Bread', displayName: 'Bread', receiptDate: '2026-05-01' },
        { canonicalName: 'Bread', displayName: 'Bread', receiptDate: '2026-05-15' },
      ],
      '2026-06-01'
    );

    assert.ok(results.length >= 1);
    assert.equal(results[0].displayName, 'Milk');
    assert.equal(results[0].overdue, true);
    assert.ok(results[0].daysSinceLastPurchase > results[0].medianDaysBetween);
  });

  it('ignores items with fewer than two purchase dates', () => {
    const results = computeRepurchaseCadences(
      [{ canonicalName: 'Eggs', displayName: 'Eggs', receiptDate: '2026-05-20' }],
      '2026-06-01'
    );
    assert.equal(results.length, 0);
  });

  it('does not flag items bought recently within cadence', () => {
    const results = computeRepurchaseCadences(
      [
        { canonicalName: 'Rice', displayName: 'Rice', receiptDate: '2026-05-20' },
        { canonicalName: 'Rice', displayName: 'Rice', receiptDate: '2026-05-27' },
        { canonicalName: 'Rice', displayName: 'Rice', receiptDate: '2026-06-01' },
      ],
      '2026-06-02'
    );
    assert.equal(results.length, 0);
  });
});
