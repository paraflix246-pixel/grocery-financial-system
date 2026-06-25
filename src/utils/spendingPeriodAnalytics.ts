import type { Receipt } from '@/src/models/types';
import { addDaysToISO } from '@/src/utils/dateParser';
import { getReceiptDisplayTotal } from '@/src/utils/receiptTotals';

export type SpendingPeriod = 'day' | 'week' | 'month' | 'year';

export type SpendingTrendPoint = { date: string; amount: number; label: string };

export type PeriodSpendHighlight = { date: string; amount: number; label: string };

export type PeriodSpendAnalytics = {
  period: SpendingPeriod;
  periodTotal: number;
  percentChange: number;
  spendingTrend: SpendingTrendPoint[];
  highlight: PeriodSpendHighlight | null;
  periodLabel: string;
  comparisonLabel: string;
  emptyMessage: string;
};

export const SPENDING_PERIOD_OPTIONS: { id: SpendingPeriod; label: string; pillLabel: string }[] = [
  { id: 'day', label: 'Day', pillLabel: 'Today' },
  { id: 'week', label: 'Week', pillLabel: 'This Week' },
  { id: 'month', label: 'Month', pillLabel: 'This Month' },
  { id: 'year', label: 'Year', pillLabel: 'This Year' },
];

function isoFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeekLocal(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return isoFromDate(d);
}

function endOfWeekLocal(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + (6 - d.getDay()));
  return isoFromDate(d);
}

function firstOfMonthISO(date: Date): string {
  return isoFromDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function firstOfYearISO(date: Date): string {
  return isoFromDate(new Date(date.getFullYear(), 0, 1));
}

function lastOfMonthISO(date: Date): string {
  return isoFromDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function sumReceiptsInRange(receipts: Receipt[], start: string, end: string): number {
  return receipts
    .filter((r) => r.date >= start && r.date <= end)
    .reduce((sum, r) => sum + getReceiptDisplayTotal(r), 0);
}

function percentChange(current: number, previous: number): number {
  if (previous > 0) return ((current - previous) / previous) * 100;
  return 0;
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function weekdayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' });
}

function monthShortLabel(monthIndex: number): string {
  return new Date(2000, monthIndex, 1).toLocaleDateString(undefined, { month: 'short' });
}

function todayISOFrom(date: Date): string {
  return isoFromDate(date);
}

export function getPeriodDateRange(period: SpendingPeriod, now = new Date()): { start: string; end: string } {
  const today = todayISOFrom(now);

  switch (period) {
    case 'day':
      return { start: today, end: today };
    case 'week':
      return { start: startOfWeekLocal(now), end: endOfWeekLocal(now) };
    case 'month':
      return { start: firstOfMonthISO(now), end: today };
    case 'year':
      return { start: firstOfYearISO(now), end: today };
  }
}

export function getPreviousPeriodDateRange(
  period: SpendingPeriod,
  now = new Date()
): { start: string; end: string } {
  const today = todayISOFrom(now);

  switch (period) {
    case 'day': {
      const yesterday = addDaysToISO(today, -1);
      return { start: yesterday, end: yesterday };
    }
    case 'week': {
      const lastWeekAnchor = addDaysToISO(today, -7);
      const anchor = new Date(`${lastWeekAnchor}T12:00:00`);
      return { start: startOfWeekLocal(anchor), end: endOfWeekLocal(anchor) };
    }
    case 'month': {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: firstOfMonthISO(prevMonth), end: lastOfMonthISO(prevMonth) };
    }
    case 'year': {
      const prevYear = now.getFullYear() - 1;
      const start = `${prevYear}-01-01`;
      const endAnchor = new Date(prevYear, now.getMonth(), now.getDate());
      return { start, end: isoFromDate(endAnchor) };
    }
  }
}

function buildDailyTrend(receipts: Receipt[], start: string, end: string): SpendingTrendPoint[] {
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    if (receipt.date < start || receipt.date > end) continue;
    totals.set(receipt.date, (totals.get(receipt.date) ?? 0) + getReceiptDisplayTotal(receipt));
  }

  const points: SpendingTrendPoint[] = [];
  let cursor = start;
  while (cursor <= end) {
    points.push({
      date: cursor,
      amount: totals.get(cursor) ?? 0,
      label: weekdayLabel(cursor),
    });
    cursor = addDaysToISO(cursor, 1);
  }
  return points;
}

function buildMonthDailyTrend(receipts: Receipt[], now = new Date()): SpendingTrendPoint[] {
  const start = firstOfMonthISO(now);
  const end = todayISOFrom(now);
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    if (receipt.date < start || receipt.date > end) continue;
    totals.set(receipt.date, (totals.get(receipt.date) ?? 0) + getReceiptDisplayTotal(receipt));
  }

  const points: SpendingTrendPoint[] = [];
  const endDay = new Date(`${end}T12:00:00`).getDate();
  for (let day = 1; day <= endDay; day++) {
    const iso = isoFromDate(new Date(now.getFullYear(), now.getMonth(), day));
    points.push({
      date: iso,
      amount: totals.get(iso) ?? 0,
      label: String(day),
    });
  }
  return points;
}

function buildYearMonthlyTrend(receipts: Receipt[], now = new Date()): SpendingTrendPoint[] {
  const year = now.getFullYear();
  const start = `${year}-01-01`;
  const end = todayISOFrom(now);
  const totals = new Map<number, number>();

  for (const receipt of receipts) {
    if (receipt.date < start || receipt.date > end) continue;
    const month = parseInt(receipt.date.slice(5, 7), 10) - 1;
    totals.set(month, (totals.get(month) ?? 0) + getReceiptDisplayTotal(receipt));
  }

  const points: SpendingTrendPoint[] = [];
  for (let month = 0; month <= now.getMonth(); month++) {
    points.push({
      date: isoFromDate(new Date(year, month, 1)),
      amount: totals.get(month) ?? 0,
      label: monthShortLabel(month),
    });
  }
  return points;
}

function findHighlight(points: SpendingTrendPoint[]): PeriodSpendHighlight | null {
  const peak = points.reduce<(SpendingTrendPoint & { amount: number }) | null>((best, point) => {
    if (point.amount <= 0) return best;
    if (!best || point.amount > best.amount) return point;
    return best;
  }, null);

  if (!peak) return null;
  return {
    date: peak.date,
    amount: peak.amount,
    label: formatShortDate(peak.date),
  };
}

export function buildPeriodSpendAnalytics(
  receipts: Receipt[],
  period: SpendingPeriod,
  now = new Date()
): PeriodSpendAnalytics {
  const currentRange = getPeriodDateRange(period, now);
  const previousRange = getPreviousPeriodDateRange(period, now);
  const periodTotal = sumReceiptsInRange(receipts, currentRange.start, currentRange.end);
  const previousTotal = sumReceiptsInRange(receipts, previousRange.start, previousRange.end);

  let spendingTrend: SpendingTrendPoint[];
  switch (period) {
    case 'day':
      spendingTrend = [
        {
          date: currentRange.start,
          amount: periodTotal,
          label: 'Today',
        },
      ];
      break;
    case 'week':
      spendingTrend = buildDailyTrend(receipts, currentRange.start, currentRange.end);
      break;
    case 'month':
      spendingTrend = buildMonthDailyTrend(receipts, now);
      break;
    case 'year':
      spendingTrend = buildYearMonthlyTrend(receipts, now);
      break;
  }

  const option = SPENDING_PERIOD_OPTIONS.find((o) => o.id === period)!;
  const comparisonLabels: Record<SpendingPeriod, string> = {
    day: 'vs yesterday',
    week: 'vs last week',
    month: 'vs last month',
    year: 'vs last year',
  };
  const emptyMessages: Record<SpendingPeriod, string> = {
    day: 'No spending recorded today',
    week: 'No spending this week',
    month: 'No spending this month',
    year: 'No spending this year',
  };

  return {
    period,
    periodTotal,
    percentChange: percentChange(periodTotal, previousTotal),
    spendingTrend,
    highlight: findHighlight(spendingTrend),
    periodLabel: option.pillLabel,
    comparisonLabel: comparisonLabels[period],
    emptyMessage: emptyMessages[period],
  };
}

/** @deprecated Use buildPeriodSpendAnalytics with period 'month' instead. */
export function buildMonthlySpendAnalytics(receipts: Receipt[], now = new Date()): PeriodSpendAnalytics {
  return buildPeriodSpendAnalytics(receipts, 'month', now);
}
