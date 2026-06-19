import type { Receipt } from '@/src/models/types';
import {
  getComparisonByReceiptId,
  getComparisonItems,
  getLatestComparison,
  getReceiptItemsWithStore,
  getReceiptsInDateRange,
} from '@/src/services/storageService';
import { endOfWeekISO, startOfWeekISO, todayISO } from '@/src/utils/dateParser';
import { getTopVarianceDriver } from '@/src/services/matchingService';
import type { ComparisonResult } from '@/src/models/types';
import { CATEGORY_COLORS, mapToSpendingCategory } from '@/src/theme/smartCart';

export type WeeklySpendPoint = { label: string; value: number };

export type CategoryBreakdown = { category: string; amount: number; color: string };

export type StoreBreakdown = { store: string; amount: number };

export type HomeInsight = {
  weeklySpend: number;
  weeklyBudget: number;
  budgetPercent: number;
  isOverThreshold: boolean;
  isOverBudget: boolean;
  topInsight: string | null;
  comparisonSummary: string | null;
  avgReceiptValue: number;
  mostExpensiveStore: string | null;
  mostBoughtItem: string | null;
};

export type SpendingTrendPoint = { date: string; amount: number; label: string };

export type MonthlySpendAnalytics = {
  monthlyTotal: number;
  percentChange: number;
  chartPoints: { label: string; value: number }[];
  dailyPoints: { label: string; value: number }[];
  spendingTrend: SpendingTrendPoint[];
  categoryBreakdown: CategoryBreakdown[];
};

export type CategoryBudget = {
  category: string;
  spent: number;
  limit: number;
  color: string;
};

export type PriceAlert = {
  itemName: string;
  store: string;
  oldPrice: number;
  newPrice: number;
  percentDrop: number;
  emoji: string;
};

const CHART_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548'];

export async function getWeeklySpendChart(weeks = 4): Promise<WeeklySpendPoint[]> {
  const points: WeeklySpendPoint[] = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const start = startOfWeekISO(d);
    const end = endOfWeekISO(d);
    const receipts = await getReceiptsInDateRange(start, end);
    const total = receipts.reduce((s, r) => s + r.total, 0);
    const label = new Date(start + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    points.push({ label, value: total });
  }
  return points;
}

export async function getCurrentWeekSpend(): Promise<number> {
  const start = startOfWeekISO();
  const end = endOfWeekISO();
  const receipts = await getReceiptsInDateRange(start, end);
  return receipts.reduce((s, r) => s + r.total, 0);
}

export async function getCategoryBreakdown(receipts: Receipt[]): Promise<CategoryBreakdown[]> {
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    const items = receipt.items ?? [];
    if (items.length === 0) {
      totals.set('Uncategorized', (totals.get('Uncategorized') ?? 0) + receipt.total);
    } else {
      for (const item of items) {
        const cat = guessCategory(item.name);
        totals.set(cat, (totals.get(cat) ?? 0) + item.price * item.quantity);
      }
    }
  }
  return Array.from(totals.entries())
    .map(([category, amount], i) => ({
      category,
      amount,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getStoreBreakdown(receipts: Receipt[]): Promise<StoreBreakdown[]> {
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    totals.set(receipt.storeName, (totals.get(receipt.storeName) ?? 0) + receipt.total);
  }
  return Array.from(totals.entries())
    .map(([store, amount]) => ({ store, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function guessCategory(name: string): string {
  return mapToSpendingCategory(name);
}

export function getWeekDateRangeLabel(date = new Date()): string {
  const start = new Date(startOfWeekISO(date) + 'T12:00:00');
  const end = new Date(endOfWeekISO(date) + 'T12:00:00');
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `This Week, ${fmt(start)} – ${fmt(end)}`;
}

export async function getDashboardCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const start = startOfWeekISO();
  const end = endOfWeekISO();
  const receipts = await getReceiptsInDateRange(start, end);
  const full = await Promise.all(
    receipts.map(async (r) => {
      const { getReceiptById } = await import('@/src/services/storageService');
      return (await getReceiptById(r.id))!;
    })
  );
  const raw = await getCategoryBreakdown(full);
  const groups = ['Groceries', 'Household', 'Snacks', 'Beverages'] as const;
  return groups.map((category) => ({
    category,
    amount: raw.find((r) => r.category === category)?.amount ?? 0,
    color: CATEGORY_COLORS[category],
  }));
}

export async function getCategoryBudgets(monthlyBudget: number): Promise<CategoryBudget[]> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const thisMonthEnd = todayISO();
  const receipts = await getReceiptsInDateRange(thisMonthStart, thisMonthEnd);
  const full = await Promise.all(
    receipts.map(async (r) => {
      const { getReceiptById } = await import('@/src/services/storageService');
      return (await getReceiptById(r.id))!;
    })
  );
  const breakdown = await getCategoryBreakdown(full);
  const limits: Record<string, number> = {
    Groceries: monthlyBudget * 0.5,
    Household: monthlyBudget * 0.2,
    Snacks: monthlyBudget * 0.15,
    Beverages: monthlyBudget * 0.15,
  };
  return (['Groceries', 'Household', 'Snacks', 'Beverages'] as const).map((category) => ({
    category,
    spent: breakdown.find((b) => b.category === category)?.amount ?? 0,
    limit: limits[category],
    color: CATEGORY_COLORS[category],
  }));
}

export async function buildHomeInsight(
  weeklyBudget: number,
  alertThreshold: number
): Promise<HomeInsight> {
  const weeklySpend = await getCurrentWeekSpend();
  const budgetPercent = weeklyBudget > 0 ? weeklySpend / weeklyBudget : 0;

  const start = startOfWeekISO();
  const end = endOfWeekISO();
  const weekReceipts = await getReceiptsInDateRange(start, end);

  const avgReceiptValue =
    weekReceipts.length > 0
      ? weekReceipts.reduce((s, r) => s + r.total, 0) / weekReceipts.length
      : 0;

  const storeBreakdown = await getStoreBreakdown(weekReceipts);
  const mostExpensiveStore = storeBreakdown[0]?.store ?? null;

  const itemCounts = new Map<string, number>();
  for (const receipt of weekReceipts) {
    for (const item of receipt.items ?? []) {
      itemCounts.set(item.name, (itemCounts.get(item.name) ?? 0) + item.quantity);
    }
  }
  let mostBoughtItem: string | null = null;
  let maxCount = 0;
  itemCounts.forEach((count, name) => {
    if (count > maxCount) {
      maxCount = count;
      mostBoughtItem = name;
    }
  });

  const latest = await getLatestComparison();
  let topInsight: string | null = null;
  let comparisonSummary: string | null = null;

  if (latest) {
    const items = await getComparisonItems(latest.id);
    const result: ComparisonResult = {
      plannedTotal: latest.plannedTotal,
      actualTotal: latest.actualTotal,
      variance: latest.variance,
      items: items.map((i) => ({
        name: i.name,
        matchType: i.matchType,
        plannedPrice: i.plannedPrice,
        actualPrice: i.actualPrice,
        variance: i.variance,
      })),
    };
    const driver = getTopVarianceDriver(result);
    const direction = latest.variance >= 0 ? 'Over' : 'Under';
    comparisonSummary = `${direction} plan by $${Math.abs(latest.variance).toFixed(2)}`;
    if (driver) {
      topInsight = `${comparisonSummary} — ${driver}`;
    } else {
      topInsight = comparisonSummary;
    }
  }

  return {
    weeklySpend,
    weeklyBudget,
    budgetPercent,
    isOverThreshold: budgetPercent >= alertThreshold,
    isOverBudget: budgetPercent >= 1,
    topInsight,
    comparisonSummary,
    avgReceiptValue,
    mostExpensiveStore,
    mostBoughtItem,
  };
}

export async function getSpendingTrend(month = new Date()): Promise<SpendingTrendPoint[]> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const monthStart = new Date(year, monthIndex, 1).toISOString().split('T')[0];
  const today = todayISO();
  const monthEndDate = new Date(year, monthIndex + 1, 0);
  const monthEnd = monthEndDate.toISOString().split('T')[0];
  const rangeEnd = today < monthEnd ? today : monthEnd;

  const receipts = await getReceiptsInDateRange(monthStart, rangeEnd);
  const dailyTotals = new Map<string, number>();
  for (const receipt of receipts) {
    dailyTotals.set(receipt.date, (dailyTotals.get(receipt.date) ?? 0) + receipt.total);
  }

  const points: SpendingTrendPoint[] = [];
  let cumulative = 0;
  const endDay = new Date(rangeEnd + 'T12:00:00').getDate();

  for (let day = 1; day <= endDay; day++) {
    const iso = new Date(year, monthIndex, day).toISOString().split('T')[0];
    cumulative += dailyTotals.get(iso) ?? 0;
    points.push({
      date: iso,
      amount: cumulative,
      label: String(day),
    });
  }

  return points;
}

export async function getMonthlySpendAnalytics(): Promise<MonthlySpendAnalytics> {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const thisMonthEnd = todayISO();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const [thisMonthReceipts, lastMonthReceipts] = await Promise.all([
    getReceiptsInDateRange(thisMonthStart, thisMonthEnd),
    getReceiptsInDateRange(lastMonthStart, lastMonthEnd),
  ]);

  const monthlyTotal = thisMonthReceipts.reduce((sum, r) => sum + r.total, 0);
  const lastMonthTotal = lastMonthReceipts.reduce((sum, r) => sum + r.total, 0);
  const percentChange =
    lastMonthTotal > 0 ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  const weekBuckets = new Map<string, number>();
  for (const receipt of thisMonthReceipts) {
    const weekStart = startOfWeekISO(new Date(receipt.date + 'T12:00:00'));
    weekBuckets.set(weekStart, (weekBuckets.get(weekStart) ?? 0) + receipt.total);
  }

  const chartPoints = Array.from(weekBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, value]) => ({
      label: new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value,
    }));

  if (chartPoints.length === 0 && monthlyTotal > 0) {
    chartPoints.push({
      label: new Date(thisMonthStart + 'T12:00:00').toLocaleDateString(undefined, { month: 'short' }),
      value: monthlyTotal,
    });
  }

  const dailyBuckets = new Map<string, number>();
  for (const receipt of thisMonthReceipts) {
    dailyBuckets.set(receipt.date, (dailyBuckets.get(receipt.date) ?? 0) + receipt.total);
  }
  const dailyPoints = Array.from(dailyBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, value]) => ({
      label: new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric' }),
      value,
    }));

  const categoryBreakdown = await getCategoryBreakdown(
    await Promise.all(
      thisMonthReceipts.map(async (r) => {
        const { getReceiptById } = await import('@/src/services/storageService');
        return (await getReceiptById(r.id))!;
      })
    )
  );

  const spendingTrend = await getSpendingTrend(now);

  return { monthlyTotal, percentChange, chartPoints, dailyPoints, spendingTrend, categoryBreakdown };
}

function itemEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (/milk/.test(lower)) return '🥛';
  if (/banana|apple|fruit|berry/.test(lower)) return '🍌';
  if (/bread|bagel|bun/.test(lower)) return '🍞';
  if (/cereal|cheerio|oat/.test(lower)) return '🥣';
  if (/egg/.test(lower)) return '🥚';
  if (/chicken|meat|beef/.test(lower)) return '🍗';
  if (/coffee|tea/.test(lower)) return '☕';
  return '🛒';
}

export async function getPriceAlerts(limit = 5): Promise<PriceAlert[]> {
  const items = await getReceiptItemsWithStore();
  const grouped = new Map<string, typeof items>();

  for (const item of items) {
    const key = `${item.name.toLowerCase()}::${item.storeName.toLowerCase()}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const alerts: PriceAlert[] = [];

  for (const bucket of grouped.values()) {
    bucket.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
    if (bucket.length < 2) continue;

    const latest = bucket[0];
    const previous = bucket.slice(1, 4);
    const avgPrevious = previous.reduce((sum, entry) => sum + entry.price, 0) / previous.length;

    if (avgPrevious <= latest.price) continue;

    const percentDrop = ((avgPrevious - latest.price) / avgPrevious) * 100;
    if (percentDrop < 3) continue;

    alerts.push({
      itemName: latest.name,
      store: latest.storeName,
      oldPrice: avgPrevious,
      newPrice: latest.price,
      percentDrop,
      emoji: itemEmoji(latest.name),
    });
  }

  return alerts.sort((a, b) => b.percentDrop - a.percentDrop).slice(0, limit);
}

export async function getComparisonForReceipt(receiptId: string) {
  const comparison = await getComparisonByReceiptId(receiptId);
  if (!comparison) return null;
  const items = await getComparisonItems(comparison.id);
  return { ...comparison, items };
}
