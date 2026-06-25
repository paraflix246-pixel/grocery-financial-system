import type { ComparisonResult, MatchType } from '@/src/models/types';
import { formatCurrency } from '@/src/utils/priceParser';

export type ComparisonItemLike = ComparisonResult['items'][number];

export type GroupedComparisonItems = Record<MatchType, ComparisonItemLike[]>;

export function groupComparisonItems(items: ComparisonItemLike[]): GroupedComparisonItems {
  return {
    matched: items.filter((i) => i.matchType === 'matched'),
    missing: items.filter((i) => i.matchType === 'missing'),
    extra: items.filter((i) => i.matchType === 'extra'),
  };
}

export function listHasUnpricedItems(items: ComparisonItemLike[]): boolean {
  return items.some(
    (i) =>
      (i.matchType === 'missing' || i.matchType === 'matched') && (i.plannedPrice ?? 0) === 0
  );
}

export function formatPlannedTotalLabel(
  plannedTotal: number,
  items?: ComparisonItemLike[]
): string {
  if (plannedTotal > 0) return formatCurrency(plannedTotal);
  if (items && items.length > 0 && listHasUnpricedItems(items)) return 'Not estimated';
  return formatCurrency(plannedTotal);
}

function itemWord(count: number): string {
  return count === 1 ? 'item' : 'items';
}

function joinNames(names: string[], max = 3): string {
  const slice = names.slice(0, max);
  if (names.length <= max) {
    if (slice.length === 1) return slice[0];
    if (slice.length === 2) return `${slice[0]} and ${slice[1]}`;
    return `${slice.slice(0, -1).join(', ')}, and ${slice[slice.length - 1]}`;
  }
  const rest = names.length - max;
  const prefix = slice.join(', ');
  return `${prefix}, and ${rest} more`;
}

export function buildComparisonNarrative(comparison: {
  plannedTotal: number;
  actualTotal: number;
  variance: number;
  items?: ComparisonItemLike[];
}): string {
  const items = comparison.items ?? [];
  const { matched, missing, extra } = groupComparisonItems(items);
  const parts: string[] = [];
  const unpriced = listHasUnpricedItems(items);

  if (extra.length > 0) {
    const extraTotal = extra.reduce((sum, i) => sum + (i.actualPrice ?? 0), 0);
    const pricePart = extraTotal > 0 ? ` for ${formatCurrency(extraTotal)}` : '';
    parts.push(
      `You bought ${extra.length} ${itemWord(extra.length)} that ${extra.length === 1 ? "wasn't" : "weren't"} on your list${pricePart}.`
    );
  }

  if (missing.length > 0) {
    const names = joinNames(missing.map((i) => i.name));
    parts.push(
      `${names} ${missing.length === 1 ? 'was' : 'were'} on your list but not purchased.`
    );
  }

  if (matched.length > 0 && missing.length === 0 && extra.length === 0) {
    parts.push(
      `All ${matched.length} planned ${itemWord(matched.length)} ${matched.length === 1 ? 'was' : 'were'} purchased.`
    );
  } else if (matched.length > 0) {
    parts.push(
      `${matched.length} planned ${itemWord(matched.length)} matched what you bought.`
    );
  }

  if (comparison.plannedTotal > 0) {
    const diff = Math.abs(comparison.variance);
    if (diff >= 0.01) {
      if (comparison.variance > 0) {
        parts.push(`You spent ${formatCurrency(diff)} more than planned.`);
      } else {
        parts.push(`You spent ${formatCurrency(diff)} less than planned.`);
      }
    } else if (parts.length === 0) {
      parts.push('Your spending matched your list total.');
    }
  } else if (unpriced && comparison.actualTotal > 0) {
    parts.push('Your list had no prices, so we cannot compare totals to a budget.');
  } else if (parts.length === 0) {
    parts.push('Link a list with item prices to see how spending compares to your plan.');
  }

  return parts.join(' ');
}

export function formatVarianceLabel(
  variance: number,
  plannedTotal: number
): { label: string; value: string } | null {
  if (plannedTotal <= 0) return null;
  const diff = Math.abs(variance);
  if (diff < 0.01) return null;
  return {
    label: variance >= 0 ? 'Spent over plan' : 'Spent under plan',
    value: formatCurrency(diff),
  };
}

export function getTopVarianceDriver(comparison: {
  items: ComparisonItemLike[];
}): string | null {
  const matched = comparison.items.filter((i) => i.matchType === 'matched' && (i.variance ?? 0) > 0);
  if (matched.length === 0) return null;
  matched.sort((a, b) => (b.variance ?? 0) - (a.variance ?? 0));
  const top = matched[0];
  return `${top.name} +$${(top.variance ?? 0).toFixed(2)}`;
}

export function getOverspendDrivers(
  items: ComparisonItemLike[]
): Array<{ name: string; amount: number; matchType: 'matched' | 'extra' }> {
  const drivers: Array<{ name: string; amount: number; matchType: 'matched' | 'extra' }> = [];
  for (const item of items) {
    if (item.matchType === 'extra') {
      const amount = item.actualPrice ?? 0;
      if (amount > 0.009) drivers.push({ name: item.name, amount, matchType: 'extra' });
    } else if (item.matchType === 'matched') {
      const amount = item.variance ?? 0;
      if (amount > 0.009) drivers.push({ name: item.name, amount, matchType: 'matched' });
    }
  }
  return drivers.sort((a, b) => b.amount - a.amount);
}
