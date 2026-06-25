import type { Receipt } from '@/src/models/types';
import { normalizeReceiptDate } from '@/src/utils/dateParser';
import { getReceiptDisplayTotal } from '@/src/utils/receiptTotals';
import {
  getPeriodDateRange,
  SPENDING_PERIOD_OPTIONS,
  type SpendingPeriod,
} from '@/src/utils/spendingPeriodAnalytics';
import { mapToSpendingCategory, CATEGORY_COLORS } from '@/src/theme/smartCart';

export const SPENDING_OVERVIEW_CATEGORIES = ['Groceries', 'Household', 'Snacks', 'Beverages'] as const;

export type SpendingOverviewCategory = (typeof SPENDING_OVERVIEW_CATEGORIES)[number];

export type SpendingOverviewBreakdown = {
  category: SpendingOverviewCategory;
  amount: number;
  color: string;
};

function filterReceiptsByDateRange(
  receipts: Receipt[],
  startDate: string,
  endDate: string
): Receipt[] {
  return receipts.filter((receipt) => {
    const date = normalizeReceiptDate(receipt.date);
    return date >= startDate && date <= endDate;
  });
}

export function getSpendingOverviewReceipts(
  receipts: Receipt[],
  period: SpendingPeriod,
  date = new Date()
): { receipts: Receipt[]; periodLabel: string } {
  const { start, end } = getPeriodDateRange(period, date);
  const filtered = filterReceiptsByDateRange(receipts, start, end);
  const option = SPENDING_PERIOD_OPTIONS.find((entry) => entry.id === period);
  return {
    receipts: filtered,
    periodLabel: option?.pillLabel ?? 'This month',
  };
}

export function buildSpendingOverviewBreakdown(receipts: Receipt[]): SpendingOverviewBreakdown[] {
  const totals = new Map<string, number>();

  for (const receipt of receipts) {
    const items = receipt.items ?? [];
    if (items.length === 0) {
      totals.set('Uncategorized', (totals.get('Uncategorized') ?? 0) + getReceiptDisplayTotal(receipt));
      continue;
    }
    for (const item of items) {
      const category = mapToSpendingCategory(item.name);
      totals.set(category, (totals.get(category) ?? 0) + item.price * item.quantity);
    }
  }

  const uncategorized = totals.get('Uncategorized') ?? 0;
  return SPENDING_OVERVIEW_CATEGORIES.map((category) => ({
    category,
    amount: (totals.get(category) ?? 0) + (category === 'Groceries' ? uncategorized : 0),
    color: CATEGORY_COLORS[category],
  }));
}
