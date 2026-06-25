import type { Receipt } from '@/src/models/types';
import { addDaysToISO } from '@/src/utils/dateParser';
import { getReceiptDisplayTotal } from '@/src/utils/receiptTotals';

export const ROBINHOOD_RANGE_OPTIONS = [
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: 'all', label: 'ALL' },
] as const;

export type RobinhoodChartRange = (typeof ROBINHOOD_RANGE_OPTIONS)[number]['id'];

export type RobinhoodChartPoint = {
  date: string;
  amount: number;
  cumulative: number;
  receiptId: string | null;
  storeName?: string | null;
  itemCount?: number;
};

export type RobinhoodSpendAnalyticsOptions = {
  periodOffset?: number;
  zoomFactor?: number;
};

export type RobinhoodSpendAnalytics = {
  range: RobinhoodChartRange;
  periodOffset: number;
  zoomFactor: number;
  periodTotal: number;
  previousTotal: number;
  dollarChange: number;
  percentChange: number;
  isSpendingUp: boolean;
  chartPoints: RobinhoodChartPoint[];
  hasAnyReceipts: boolean;
  hasReceiptsInPeriod: boolean;
  emptyMessage: string | null;
  periodLabel: string;
  isViewingPastPeriod: boolean;
  windowStart: string;
  windowEnd: string;
};

function isoFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function firstOfMonthISO(date: Date): string {
  return isoFromDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function lastOfMonthISO(date: Date): string {
  return isoFromDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function firstOfYearISO(date: Date): string {
  return isoFromDate(new Date(date.getFullYear(), 0, 1));
}

export function clampPeriodOffset(range: RobinhoodChartRange, periodOffset: number): number {
  if (range === 'all') return 0;
  return Math.min(0, periodOffset);
}

export function isValidChartReceipt(receipt: Receipt): boolean {
  const total = getReceiptDisplayTotal(receipt);
  return Number.isFinite(total) && total > 0;
}

export function filterValidReceipts(receipts: Receipt[]): Receipt[] {
  return receipts.filter(isValidChartReceipt);
}

export function applyZoomToDateRange(
  start: string,
  end: string,
  zoomFactor: number
): { start: string; end: string } {
  if (zoomFactor <= 1.01) return { start, end };
  const startMs = new Date(`${start}T12:00:00`).getTime();
  const endMs = new Date(`${end}T12:00:00`).getTime();
  const span = Math.max(endMs - startMs, 1);
  const visibleSpan = span / zoomFactor;
  const newStartMs = endMs - visibleSpan;
  return { start: isoFromDate(new Date(newStartMs)), end };
}

export function getRobinhoodDateRange(
  range: RobinhoodChartRange,
  now = new Date(),
  earliestReceiptDate?: string,
  periodOffset = 0
): { start: string; end: string } {
  const offset = clampPeriodOffset(range, periodOffset);

  switch (range) {
    case '1w': {
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + offset * 7);
      const end = isoFromDate(endDate);
      return { start: addDaysToISO(end, -6), end };
    }
    case '1m': {
      if (offset === 0) {
        return { start: firstOfMonthISO(now), end: isoFromDate(now) };
      }
      const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return { start: firstOfMonthISO(target), end: lastOfMonthISO(target) };
    }
    case '3m': {
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + offset * 3);
      const end = offset === 0 ? isoFromDate(now) : lastOfMonthISO(endDate);
      const endAnchor = new Date(`${end}T12:00:00`);
      const startDate = new Date(endAnchor.getFullYear(), endAnchor.getMonth() - 2, 1);
      return { start: isoFromDate(startDate), end };
    }
    case '6m': {
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + offset * 6);
      const end = offset === 0 ? isoFromDate(now) : lastOfMonthISO(endDate);
      const endAnchor = new Date(`${end}T12:00:00`);
      const startDate = new Date(endAnchor.getFullYear(), endAnchor.getMonth() - 5, 1);
      return { start: isoFromDate(startDate), end };
    }
    case '1y': {
      if (offset === 0) {
        return { start: firstOfYearISO(now), end: isoFromDate(now) };
      }
      const year = now.getFullYear() + offset;
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
    case 'all':
      return { start: earliestReceiptDate ?? isoFromDate(now), end: isoFromDate(now) };
  }
}

export function getRobinhoodPreviousDateRange(
  range: RobinhoodChartRange,
  currentStart: string,
  currentEnd: string
): { start: string; end: string } {
  if (range === 'all') {
    return { start: currentEnd, end: currentEnd };
  }

  if (range === '1m') {
    const endDate = new Date(`${currentEnd}T12:00:00`);
    const startDate = new Date(`${currentStart}T12:00:00`);
    const lastDayPrevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
    const prevStartDay = Math.min(startDate.getDate(), lastDayPrevMonth);
    const prevEndDay = Math.min(endDate.getDate(), lastDayPrevMonth);
    return {
      start: isoFromDate(
        new Date(endDate.getFullYear(), endDate.getMonth() - 1, prevStartDay)
      ),
      end: isoFromDate(new Date(endDate.getFullYear(), endDate.getMonth() - 1, prevEndDay)),
    };
  }

  if (range === '1y') {
    const startDate = new Date(`${currentStart}T12:00:00`);
    const endDate = new Date(`${currentEnd}T12:00:00`);
    return {
      start: isoFromDate(
        new Date(startDate.getFullYear() - 1, startDate.getMonth(), startDate.getDate())
      ),
      end: isoFromDate(
        new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate())
      ),
    };
  }

  const dayCount =
    Math.round(
      (new Date(`${currentEnd}T12:00:00`).getTime() -
        new Date(`${currentStart}T12:00:00`).getTime()) /
        86400000
    ) + 1;
  const prevEnd = addDaysToISO(currentStart, -1);
  const prevStart = addDaysToISO(prevEnd, -(dayCount - 1));
  return { start: prevStart, end: prevEnd };
}

export function formatRobinhoodPeriodLabel(
  range: RobinhoodChartRange,
  start: string,
  end: string
): string {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);

  if (range === 'all') return 'All time';

  const monthYear = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  if (range === '1m' || range === '1y') {
    return monthYear(startDate);
  }

  if (range === '1w') {
    const sameMonth =
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getFullYear() === endDate.getFullYear();
    if (sameMonth) {
      const month = startDate.toLocaleDateString(undefined, { month: 'short' });
      return `${month} ${startDate.getDate()} – ${endDate.getDate()}`;
    }
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${fmt(startDate)} – ${fmt(endDate)}`;
  }

  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  if (sameYear) {
    const startFmt = startDate.toLocaleDateString(undefined, { month: 'short' });
    const endFmt = endDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    return `${startFmt} – ${endFmt}`;
  }

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

function sumReceiptsInRange(receipts: Receipt[], start: string, end: string): number {
  return receipts
    .filter((receipt) => receipt.date >= start && receipt.date <= end)
    .reduce((sum, receipt) => sum + getReceiptDisplayTotal(receipt), 0);
}

function compareReceipts(a: Receipt, b: Receipt): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.createdAt.localeCompare(b.createdAt);
}

export function buildRobinhoodChartSeries(
  receipts: Receipt[],
  start: string,
  end: string
): RobinhoodChartPoint[] {
  const inRange = receipts
    .filter((receipt) => receipt.date >= start && receipt.date <= end)
    .sort(compareReceipts);

  const points: RobinhoodChartPoint[] = [
    { date: start, amount: 0, cumulative: 0, receiptId: null },
  ];

  let cumulative = 0;
  for (const receipt of inRange) {
    const amount = getReceiptDisplayTotal(receipt);
    cumulative += amount;
    points.push({
      date: receipt.date,
      amount,
      cumulative,
      receiptId: receipt.id,
      storeName: receipt.storeName,
      itemCount: receipt.items?.length ?? 0,
    });
  }

  const lastCumulative = points[points.length - 1]?.cumulative ?? 0;
  if (points[points.length - 1]?.date !== end) {
    points.push({ date: end, amount: 0, cumulative: lastCumulative, receiptId: null });
  }

  return points;
}

export function buildRobinhoodSpendAnalytics(
  receipts: Receipt[],
  range: RobinhoodChartRange,
  now = new Date(),
  options: RobinhoodSpendAnalyticsOptions = {}
): RobinhoodSpendAnalytics {
  const periodOffset = clampPeriodOffset(range, options.periodOffset ?? 0);
  const zoomFactor = Math.max(1, options.zoomFactor ?? 1);

  const validReceipts = filterValidReceipts(receipts);
  const hasAnyReceipts = validReceipts.length > 0;
  const earliestReceiptDate = hasAnyReceipts
    ? validReceipts.reduce(
        (min, receipt) => (receipt.date < min ? receipt.date : min),
        validReceipts[0].date
      )
    : undefined;

  const baseRange = getRobinhoodDateRange(range, now, earliestReceiptDate, periodOffset);
  const { start, end } = applyZoomToDateRange(baseRange.start, baseRange.end, zoomFactor);

  const previousRange = getRobinhoodPreviousDateRange(range, start, end);

  const periodTotal = sumReceiptsInRange(validReceipts, start, end);
  const previousTotal =
    range === 'all' ? 0 : sumReceiptsInRange(validReceipts, previousRange.start, previousRange.end);

  const dollarChange = periodTotal - previousTotal;
  const percentChange =
    range === 'all'
      ? 0
      : previousTotal <= 0
        ? periodTotal > 0
          ? 100
          : 0
        : (dollarChange / previousTotal) * 100;

  const receiptsInPeriod = validReceipts.filter(
    (receipt) => receipt.date >= start && receipt.date <= end
  );
  const hasReceiptsInPeriod = receiptsInPeriod.length > 0;

  let emptyMessage: string | null = null;
  if (!hasAnyReceipts) {
    emptyMessage = 'Scan your first receipt to see your spending chart';
  } else if (!hasReceiptsInPeriod) {
    emptyMessage = 'No receipts in this period';
  }

  const chartPoints = hasReceiptsInPeriod
    ? buildRobinhoodChartSeries(validReceipts, start, end)
    : [];

  return {
    range,
    periodOffset,
    zoomFactor,
    periodTotal,
    previousTotal,
    dollarChange,
    percentChange,
    isSpendingUp: dollarChange > 0,
    chartPoints,
    hasAnyReceipts,
    hasReceiptsInPeriod,
    emptyMessage,
    periodLabel: formatRobinhoodPeriodLabel(range, baseRange.start, baseRange.end),
    isViewingPastPeriod: periodOffset < 0,
    windowStart: start,
    windowEnd: end,
  };
}

export function formatChartHeaderDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTooltipDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export const ROBINHOOD_COMPARISON_LABELS: Record<RobinhoodChartRange, string> = {
  '1w': 'vs last week',
  '1m': 'vs last month',
  '3m': 'vs prior 3 months',
  '6m': 'vs prior 6 months',
  '1y': 'vs last year',
  all: '',
};

export function shiftPeriodOffset(
  range: RobinhoodChartRange,
  currentOffset: number,
  direction: 'past' | 'present'
): number {
  if (range === 'all') return 0;
  if (direction === 'past') return clampPeriodOffset(range, currentOffset - 1);
  return clampPeriodOffset(range, currentOffset + 1);
}

export function clampZoomFactor(zoomFactor: number): number {
  return Math.min(4, Math.max(1, zoomFactor));
}

export function adjustZoomFactor(current: number, scale: number): number {
  return clampZoomFactor(current * scale);
}
