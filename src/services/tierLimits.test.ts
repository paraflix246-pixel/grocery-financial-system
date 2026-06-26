import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FREE_PANTRY_MAX_ITEMS,
  FREE_PRICE_HISTORY_DAYS,
  FREE_RECEIPT_SCAN_LIMIT,
} from '@/src/constants/proPricing';
import {
  TIER_LIMITS,
  effectiveSubscriptionTier,
  filterReceiptRowsByCutoffDate,
  filterRowsByCutoffDate,
  getTierLimits,
  limitStoreRowsForTier,
  priceHistoryCutoffFromDays,
  tierAllowsFeature,
} from '@/src/constants/tierLimitsConfig';

describe('TIER_LIMITS', () => {
  it('defines free tier numeric caps', () => {
    assert.equal(TIER_LIMITS.free.receiptsPerMonth, FREE_RECEIPT_SCAN_LIMIT);
    assert.equal(TIER_LIMITS.free.pantryMaxItems, FREE_PANTRY_MAX_ITEMS);
    assert.equal(TIER_LIMITS.free.priceHistoryDays, FREE_PRICE_HISTORY_DAYS);
    assert.equal(TIER_LIMITS.free.maxStores, 1);
  });

  it('removes caps on pro', () => {
    assert.equal(TIER_LIMITS.pro.receiptsPerMonth, null);
    assert.equal(TIER_LIMITS.pro.pantryMaxItems, null);
    assert.equal(TIER_LIMITS.household.pantryMaxItems, null);
  });

  it('grants all paid features on pro tier', () => {
    assert.equal(TIER_LIMITS.pro.csvExport, true);
    assert.equal(TIER_LIMITS.pro.cheapestBasket, true);
    assert.equal(TIER_LIMITS.pro.multiUserSync, true);
    assert.equal(TIER_LIMITS.pro.budgetForecasting, true);
  });

  it('maps legacy household tier to pro limits', () => {
    assert.equal(effectiveSubscriptionTier('household'), 'pro');
    assert.deepEqual(getTierLimits('household'), getTierLimits('pro'));
  });
});

describe('tierAllowsFeature', () => {
  it('blocks pro features on free tier', () => {
    assert.equal(tierAllowsFeature('insights_pro', getTierLimits('free')), false);
    assert.equal(tierAllowsFeature('price_drop_alerts', getTierLimits('free')), false);
    assert.equal(tierAllowsFeature('community_pricing', getTierLimits('free')), false);
  });

  it('unlocks all features on pro tier', () => {
    const pro = getTierLimits('pro');
    assert.equal(tierAllowsFeature('insights_pro', pro), true);
    assert.equal(tierAllowsFeature('inflation_tracker', pro), true);
    assert.equal(tierAllowsFeature('export_advanced', pro), true);
    assert.equal(tierAllowsFeature('multi_user_sync', pro), true);
    assert.equal(tierAllowsFeature('budget_forecasting', pro), true);
    assert.equal(tierAllowsFeature('cheapest_basket', pro), true);
  });
});

describe('price history filters', () => {
  it('limits rows to cutoff date', () => {
    const cutoff = priceHistoryCutoffFromDays(FREE_PRICE_HISTORY_DAYS);
    assert.ok(cutoff);

    const oldDate = new Date(cutoff + 'T12:00:00');
    oldDate.setDate(oldDate.getDate() - 5);
    const oldIso = oldDate.toISOString().split('T')[0];

    const filtered = filterRowsByCutoffDate(
      [
        { date: oldIso, value: 1 },
        { date: cutoff!, value: 2 },
      ],
      cutoff
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.date, cutoff);
  });

  it('filters receipt rows by receiptDate', () => {
    const recent = new Date().toISOString().split('T')[0];
    const filtered = filterReceiptRowsByCutoffDate(
      [
        { receiptDate: '2000-01-01', name: 'Milk' },
        { receiptDate: recent, name: 'Eggs' },
      ],
      '2020-01-01'
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.name, 'Eggs');
  });
});

describe('limitStoreRowsForTier', () => {
  it('returns one store row on free tier', () => {
    const rows = [
      { store: 'A', price: 3, isCheapest: false },
      { store: 'B', price: 2, isCheapest: true },
    ];
    const limited = limitStoreRowsForTier(rows, false);
    assert.equal(limited.length, 1);
    assert.equal(limited[0]?.store, 'B');
  });

  it('returns all rows when multi-store is unlocked', () => {
    const rows = [
      { store: 'A', price: 3 },
      { store: 'B', price: 2 },
    ];
    assert.equal(limitStoreRowsForTier(rows, true).length, 2);
  });
});
