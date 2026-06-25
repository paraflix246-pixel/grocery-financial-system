import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Receipt } from '@/src/models/types';
import {
  applyZoomToDateRange,
  buildRobinhoodChartSeries,
  buildRobinhoodSpendAnalytics,
  clampPeriodOffset,
  filterValidReceipts,
  formatRobinhoodPeriodLabel,
  isValidChartReceipt,
  shiftPeriodOffset,
} from './robinhoodSpendAnalytics';

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

describe('isValidChartReceipt', () => {
  it('excludes zero and invalid totals', () => {
    assert.equal(isValidChartReceipt(receipt('2026-06-01', 0)), false);
    assert.equal(isValidChartReceipt(receipt('2026-06-01', 12.5)), true);
  });
});

describe('buildRobinhoodSpendAnalytics', () => {
  const now = new Date('2026-06-20T15:00:00');

  it('shows empty state when there are no receipts', () => {
    const result = buildRobinhoodSpendAnalytics([], '1m', now);
    assert.equal(result.hasAnyReceipts, false);
    assert.equal(result.emptyMessage, 'Scan your first receipt to see your spending chart');
    assert.equal(result.periodTotal, 0);
  });

  it('sums only receipts in the selected month', () => {
    const receipts = [
      receipt('2026-06-08', 561.62, 'a'),
      receipt('2026-06-15', 125.08, 'b'),
      receipt('2026-05-30', 999, 'c'),
    ];
    const result = buildRobinhoodSpendAnalytics(receipts, '1m', now);
    assert.equal(result.periodTotal, 561.62 + 125.08);
    assert.equal(result.hasReceiptsInPeriod, true);
    assert.equal(result.chartPoints.at(-1)?.cumulative, 561.62 + 125.08);
  });

  it('reports no receipts in period for an empty window', () => {
    const receipts = [receipt('2026-01-10', 40, 'a')];
    const result = buildRobinhoodSpendAnalytics(receipts, '1w', now);
    assert.equal(result.hasReceiptsInPeriod, false);
    assert.equal(result.emptyMessage, 'No receipts in this period');
  });

  it('compares the same calendar days for a partial current month', () => {
    const receipts = [
      receipt('2026-05-10', 100, 'may'),
      receipt('2026-05-25', 500, 'may-late'),
      receipt('2026-06-10', 200, 'jun'),
    ];
    const result = buildRobinhoodSpendAnalytics(receipts, '1m', now);
    assert.equal(result.periodTotal, 200);
    assert.equal(result.previousTotal, 100);
    assert.equal(result.dollarChange, 100);
    assert.equal(result.percentChange, 100);
  });

  it('uses an equal-length prior window for 1W ranges', () => {
    const receipts = [
      receipt('2026-06-18', 50, 'curr'),
      receipt('2026-06-16', 999, 'curr-week'),
      receipt('2026-06-10', 25, 'prev-week'),
    ];
    const result = buildRobinhoodSpendAnalytics(receipts, '1w', now);
    assert.equal(result.periodTotal, 50 + 999);
    assert.equal(result.previousTotal, 25);
  });
});

describe('buildRobinhoodChartSeries', () => {
  it('builds cumulative points per receipt', () => {
    const receipts = filterValidReceipts([
      receipt('2026-06-01', 10, 'a'),
      receipt('2026-06-03', 20, 'b'),
    ]);
    const points = buildRobinhoodChartSeries(receipts, '2026-06-01', '2026-06-10');
    assert.equal(points[1].cumulative, 10);
    assert.equal(points[2].cumulative, 30);
  });

  it('includes receipt metadata on receipt points', () => {
    const receipts = filterValidReceipts([
      {
        ...receipt('2026-06-08', 561.62, 'a'),
        storeName: 'Walmart',
        items: [{ id: '1', receiptId: 'a', name: 'Milk', price: 3, quantity: 1 }],
      },
    ]);
    const points = buildRobinhoodChartSeries(receipts, '2026-06-01', '2026-06-10');
    const receiptPoint = points.find((p) => p.receiptId === 'a');
    assert.equal(receiptPoint?.storeName, 'Walmart');
    assert.equal(receiptPoint?.itemCount, 1);
    assert.equal(receiptPoint?.amount, 561.62);
  });
});

describe('period offset and zoom', () => {
  const now = new Date('2026-06-20T15:00:00');

  it('clamps period offset to zero or negative', () => {
    assert.equal(clampPeriodOffset('1m', 2), 0);
    assert.equal(clampPeriodOffset('1m', -2), -2);
    assert.equal(clampPeriodOffset('all', -5), 0);
  });

  it('shifts to previous month when offset is -1', () => {
    const receipts = [receipt('2026-05-15', 100, 'a'), receipt('2026-06-10', 200, 'b')];
    const result = buildRobinhoodSpendAnalytics(receipts, '1m', now, { periodOffset: -1 });
    assert.equal(result.periodTotal, 100);
    assert.equal(result.isViewingPastPeriod, true);
    assert.equal(result.periodLabel, 'May 2026');
  });

  it('narrows visible window when zoomed in', () => {
    const receipts = [
      receipt('2026-06-01', 10, 'a'),
      receipt('2026-06-10', 20, 'b'),
      receipt('2026-06-18', 30, 'c'),
    ];
    const full = buildRobinhoodSpendAnalytics(receipts, '1m', now, { zoomFactor: 1 });
    const zoomed = buildRobinhoodSpendAnalytics(receipts, '1m', now, { zoomFactor: 2 });
    assert.equal(full.periodTotal, 60);
    assert.ok(zoomed.windowStart > full.windowStart);
    assert.ok(zoomed.periodTotal < full.periodTotal);
    assert.equal(zoomed.periodTotal, 30);
  });

  it('shiftPeriodOffset moves toward past and present', () => {
    assert.equal(shiftPeriodOffset('1m', 0, 'past'), -1);
    assert.equal(shiftPeriodOffset('1m', -2, 'present'), -1);
    assert.equal(shiftPeriodOffset('1m', 0, 'present'), 0);
  });

  it('formats period labels for month view', () => {
    const label = formatRobinhoodPeriodLabel('1m', '2026-05-01', '2026-05-31');
    assert.match(label, /May 2026/);
  });
});

describe('applyZoomToDateRange', () => {
  it('keeps range unchanged at zoom 1', () => {
    const result = applyZoomToDateRange('2026-06-01', '2026-06-20', 1);
    assert.equal(result.start, '2026-06-01');
    assert.equal(result.end, '2026-06-20');
  });

  it('shows only the most recent half when zoom is 2', () => {
    const result = applyZoomToDateRange('2026-06-01', '2026-06-20', 2);
    assert.ok(result.start > '2026-06-01');
    assert.equal(result.end, '2026-06-20');
  });
});
