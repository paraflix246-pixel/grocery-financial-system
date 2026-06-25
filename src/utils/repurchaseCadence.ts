import { todayISO } from '@/src/utils/dateParser';

export type PurchaseEvent = {
  canonicalName: string;
  displayName: string;
  receiptDate: string;
};

export type RepurchaseCadence = {
  canonicalName: string;
  displayName: string;
  medianDaysBetween: number;
  lastPurchaseDate: string;
  daysSinceLastPurchase: number;
  overdue: boolean;
};

function daysBetween(a: string, b: string): number {
  const then = new Date(`${a}T12:00:00`);
  const now = new Date(`${b}T12:00:00`);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function median(values: number[]): number {
  if (values.length === 0) return 7;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeRepurchaseCadences(
  events: PurchaseEvent[],
  today = todayISO()
): RepurchaseCadence[] {
  const byItem = new Map<string, { displayName: string; dates: string[] }>();
  for (const event of events) {
    const key = event.canonicalName.toLowerCase();
    const bucket = byItem.get(key) ?? { displayName: event.displayName, dates: [] };
    bucket.dates.push(event.receiptDate);
    byItem.set(key, bucket);
  }

  const results: RepurchaseCadence[] = [];
  for (const [, { displayName, dates }] of byItem) {
    const uniqueDates = [...new Set(dates)].sort();
    if (uniqueDates.length < 2) continue;

    const gaps: number[] = [];
    for (let i = 1; i < uniqueDates.length; i++) {
      gaps.push(daysBetween(uniqueDates[i - 1], uniqueDates[i]));
    }
    const medianDaysBetween = Math.max(1, Math.round(median(gaps)));
    const lastPurchaseDate = uniqueDates[uniqueDates.length - 1];
    const daysSinceLastPurchase = daysBetween(lastPurchaseDate, today);
    const overdue = daysSinceLastPurchase > medianDaysBetween;

    if (overdue) {
      results.push({
        canonicalName: displayName,
        displayName,
        medianDaysBetween,
        lastPurchaseDate,
        daysSinceLastPurchase,
        overdue,
      });
    }
  }

  return results.sort(
    (a, b) =>
      b.daysSinceLastPurchase / b.medianDaysBetween -
      a.daysSinceLastPurchase / a.medianDaysBetween
  );
}
