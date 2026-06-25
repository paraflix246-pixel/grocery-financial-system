import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Receipt } from '@/src/models/types';
import {
  buildPeriodSpendAnalytics,
  getPeriodDateRange,
  getPreviousPeriodDateRange,
} from './spendingPeriodAnalytics';

function receipt(date: string, total: number, id = date): Receipt {
  return {
    id,
    storeName: 'Test Mart',
    date,
    total,
    imageUri: '',
    userCorrected: false,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

describe('getPeriodDateRange', () => {
  it('returns today for day period', () => {
    const now = new Date('2026-06-20T15:00:00');
    const range = getPeriodDateRange('day', now);
    assert.equal(range.start, '2026-06-20');
    assert.equal(range.end, '2026-06-20');
  });

  it('returns current calendar week for week period', () => {
    const now = new Date('2026-06-20T15:00:00'); // Saturday
    const range = getPeriodDateRange('week', now);
    assert.equal(range.start, '2026-06-14'); // Sunday
    assert.equal(range.end, '2026-06-20'); // Saturday
  });

  it('returns month-to-date for month period', () => {
    const now = new Date('2026-06-20T15:00:00');
    const range = getPeriodDateRange('month', now);
    assert.equal(range.start, '2026-06-01');
    assert.equal(range.end, '2026-06-20');
  });
});

describe('getPreviousPeriodDateRange', () => {
  it('returns yesterday for day period', () => {
    const now = new Date('2026-06-20T15:00:00');
    const range = getPreviousPeriodDateRange('day', now);
    assert.equal(range.start, '2026-06-19');
    assert.equal(range.end, '2026-06-19');
  });

  it('returns prior week for week period', () => {
    const now = new Date('2026-06-20T15:00:00');
    const range = getPreviousPeriodDateRange('week', now);
    assert.equal(range.start, '2026-06-07');
    assert.equal(range.end, '2026-06-13');
  });
});

describe('buildPeriodSpendAnalytics', () => {
  const now = new Date('2026-06-20T15:00:00');
  const receipts = [
    receipt('2026-06-19', 40, 'r1'),
    receipt('2026-06-20', 60, 'r2'),
    receipt('2026-06-08', 561.62, 'r3'),
    receipt('2026-06-01', 25, 'r4'),
    receipt('2025-06-10', 100, 'r5'),
  ];

  it('aggregates day totals and compares to yesterday', () => {
    const analytics = buildPeriodSpendAnalytics(receipts, 'day', now);
    assert.equal(analytics.periodTotal, 60);
    assert.equal(analytics.percentChange, 50);
    assert.equal(analytics.spendingTrend.length, 1);
    assert.equal(analytics.spendingTrend[0].amount, 60);
    assert.equal(analytics.comparisonLabel, 'vs yesterday');
  });

  it('builds weekly daily buckets Sun-Sat', () => {
    const analytics = buildPeriodSpendAnalytics(receipts, 'week', now);
    assert.equal(analytics.periodTotal, 100);
    assert.equal(analytics.spendingTrend.length, 7);
    assert.equal(analytics.spendingTrend[6].amount, 60);
    assert.equal(analytics.spendingTrend[0].date, '2026-06-14');
  });

  it('builds month daily buckets and highlight', () => {
    const analytics = buildPeriodSpendAnalytics(receipts, 'month', now);
    assert.equal(analytics.periodTotal, 686.62);
    assert.equal(analytics.spendingTrend.length, 20);
    assert.ok(analytics.highlight);
    assert.equal(analytics.highlight?.amount, 561.62);
    assert.equal(analytics.highlight?.date, '2026-06-08');
  });

  it('builds year monthly buckets', () => {
    const analytics = buildPeriodSpendAnalytics(receipts, 'year', now);
    assert.equal(analytics.periodTotal, 686.62);
    assert.equal(analytics.spendingTrend.length, 6);
    assert.equal(analytics.spendingTrend[0].label, 'Jan');
    assert.equal(analytics.spendingTrend[5].amount, 686.62);
  });

  it('returns zero percent change when previous period is empty', () => {
    const analytics = buildPeriodSpendAnalytics([receipt('2026-06-20', 10)], 'day', now);
    assert.equal(analytics.percentChange, 0);
  });
});
