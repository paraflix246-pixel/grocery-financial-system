import type { CategoryLimits, ComparisonResult, Receipt } from '@/src/models/types';
import {
  getComparisonByReceiptId,
  getComparisonItems,
  getLatestComparison,
  getReceiptItemsWithStore,
  getReceiptsInDateRange,
} from '@/src/services/storageService';
import { endOfWeekISO, startOfWeekISO, todayISO } from '@/src/utils/dateParser';
import { getTopVarianceDriver } from '@/src/services/matchingService';
import { CATEGORY_COLORS, mapToSpendingCategory } from '@/src/theme/smartCart';
import { getReceiptDisplayTotal } from '@/src/utils/receiptTotals';

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
  source?: 'history' | 'custom';
  ruleId?: string;
  targetPrice?: number;
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
    const total = receipts.reduce((s, r) => s + getReceiptDisplayTotal(r), 0);
    const label = new Date(start + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    points.push({ label, value: total });
  }
  return points;
}

export async function getCurrentWeekSpend(): Promise<number> {
  const start = startOfWeekISO();
  const end = endOfWeekISO();
  const receipts = await getReceiptsInDateRange(start, end);
  return receipts.reduce((s, r) => s + getReceiptDisplayTotal(r), 0);
}

export async function getCategoryBreakdown(receipts: Receipt[]): Promise<CategoryBreakdown[]> {
  const totals = new Map<string, number>();
  for (const receipt of receipts) {
    const items = receipt.items ?? [];
    if (items.length === 0) {
      totals.set('Uncategorized', (totals.get('Uncategorized') ?? 0) + getReceiptDisplayTotal(receipt));
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
    totals.set(receipt.storeName, (totals.get(receipt.storeName) ?? 0) + getReceiptDisplayTotal(receipt));
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

export async function getCategoryBudgets(
  monthlyBudget: number,
  categoryLimits?: CategoryLimits | null
): Promise<CategoryBudget[]> {
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
  const { resolveCategoryLimits } = await import('@/src/utils/budgetDefaults');
  const limits = resolveCategoryLimits(monthlyBudget, categoryLimits);
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
      ? weekReceipts.reduce((s, r) => s + getReceiptDisplayTotal(r), 0) / weekReceipts.length
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
    dailyTotals.set(receipt.date, (dailyTotals.get(receipt.date) ?? 0) + getReceiptDisplayTotal(receipt));
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

  const monthlyTotal = thisMonthReceipts.reduce((sum, r) => sum + getReceiptDisplayTotal(r), 0);
  const lastMonthTotal = lastMonthReceipts.reduce((sum, r) => sum + getReceiptDisplayTotal(r), 0);
  const percentChange =
    lastMonthTotal > 0 ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  const weekBuckets = new Map<string, number>();
  for (const receipt of thisMonthReceipts) {
    const weekStart = startOfWeekISO(new Date(receipt.date + 'T12:00:00'));
    weekBuckets.set(weekStart, (weekBuckets.get(weekStart) ?? 0) + getReceiptDisplayTotal(receipt));
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
    dailyBuckets.set(receipt.date, (dailyBuckets.get(receipt.date) ?? 0) + getReceiptDisplayTotal(receipt));
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

// --- Phase 3: Pro insights & usage analytics ---

export type OverspendCategory = {
  category: string;
  spent: number;
  limit: number;
  overAmount: number;
  percentOfLimit: number;
  color: string;
};

export type StoreTrend = {
  store: string;
  thisMonth: number;
  lastMonth: number;
  changePercent: number;
  tripCount: number;
};

export type ShoppingFrequency = {
  tripsThisMonth: number;
  tripsLastMonth: number;
  avgDaysBetweenTrips: number | null;
  busiestDay: string | null;
};

export type ProInsights = {
  overspendCategories: OverspendCategory[];
  storeTrends: StoreTrend[];
  frequency: ShoppingFrequency;
  summaryLine: string;
};

export type InflationDataPoint = {
  label: string;
  index: number;
  monthKey: string;
};

export type PersonalInflation = {
  points: InflationDataPoint[];
  currentIndex: number;
  changePercent: number;
  trackedItems: number;
  hasEnoughData: boolean;
};

export type UsageStats = {
  receiptCount: number;
  listCount: number;
  itemLineCount: number;
  comparisonCount: number;
  firstReceiptDate: string | null;
  lastReceiptDate: string | null;
  totalSpent: number;
  avgReceiptTotal: number;
  storesVisited: number;
};

export async function getProInsights(
  monthlyBudget: number,
  categoryLimits?: CategoryLimits | null
): Promise<ProInsights> {
  const budgets = await getCategoryBudgets(monthlyBudget, categoryLimits);
  const overspendCategories = budgets
    .filter((b) => b.spent > b.limit)
    .map((b) => ({
      category: b.category,
      spent: b.spent,
      limit: b.limit,
      overAmount: b.spent - b.limit,
      percentOfLimit: b.limit > 0 ? (b.spent / b.limit) * 100 : 0,
      color: b.color,
    }))
    .sort((a, b) => b.overAmount - a.overAmount);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const thisMonthEnd = todayISO();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const [thisMonthReceipts, lastMonthReceipts] = await Promise.all([
    getReceiptsInDateRange(thisMonthStart, thisMonthEnd),
    getReceiptsInDateRange(lastMonthStart, lastMonthEnd),
  ]);

  const storeThis = new Map<string, { total: number; trips: number }>();
  for (const r of thisMonthReceipts) {
    const entry = storeThis.get(r.storeName) ?? { total: 0, trips: 0 };
    entry.total += getReceiptDisplayTotal(r);
    entry.trips += 1;
    storeThis.set(r.storeName, entry);
  }

  const storeLast = new Map<string, number>();
  for (const r of lastMonthReceipts) {
    storeLast.set(r.storeName, (storeLast.get(r.storeName) ?? 0) + getReceiptDisplayTotal(r));
  }

  const allStores = new Set([...storeThis.keys(), ...storeLast.keys()]);
  const storeTrends: StoreTrend[] = [...allStores].map((store) => {
    const thisData = storeThis.get(store);
    const thisMonth = thisData?.total ?? 0;
    const lastMonth = storeLast.get(store) ?? 0;
    const changePercent =
      lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;
    return {
      store,
      thisMonth,
      lastMonth,
      changePercent,
      tripCount: thisData?.trips ?? 0,
    };
  }).sort((a, b) => b.thisMonth - a.thisMonth);

  const tripsThisMonth = thisMonthReceipts.length;
  const tripsLastMonth = lastMonthReceipts.length;

  const sortedDates = thisMonthReceipts.map((r) => r.date).sort();
  let avgDaysBetweenTrips: number | null = null;
  if (sortedDates.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < sortedDates.length; i++) {
      const a = new Date(sortedDates[i - 1] + 'T12:00:00').getTime();
      const b = new Date(sortedDates[i] + 'T12:00:00').getTime();
      gaps.push((b - a) / (1000 * 60 * 60 * 24));
    }
    avgDaysBetweenTrips = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  }

  const dayCounts = new Map<string, number>();
  for (const r of thisMonthReceipts) {
    const day = new Date(r.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' });
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  let busiestDay: string | null = null;
  let maxDayCount = 0;
  dayCounts.forEach((count, day) => {
    if (count > maxDayCount) {
      maxDayCount = count;
      busiestDay = day;
    }
  });

  const topOverspend = overspendCategories[0];
  const topStore = storeTrends[0];
  let summaryLine = 'Keep scanning receipts to unlock personalized insights.';
  if (topOverspend) {
    summaryLine = `${topOverspend.category} is ${formatCurrencyShort(topOverspend.overAmount)} over budget this month.`;
  } else if (topStore && topStore.thisMonth > 0) {
    summaryLine = `Most spending at ${topStore.store} — $${topStore.thisMonth.toFixed(0)} this month.`;
  } else if (tripsThisMonth > 0) {
    summaryLine = `${tripsThisMonth} shopping trips this month${avgDaysBetweenTrips ? `, ~every ${Math.round(avgDaysBetweenTrips)} days` : ''}.`;
  }

  return {
    overspendCategories,
    storeTrends,
    frequency: {
      tripsThisMonth,
      tripsLastMonth,
      avgDaysBetweenTrips,
      busiestDay,
    },
    summaryLine,
  };
}

function formatCurrencyShort(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function normalizeItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function getPersonalInflation(months = 6): Promise<PersonalInflation> {
  const items = await getReceiptItemsWithStore();
  if (items.length < 4) {
    return { points: [], currentIndex: 100, changePercent: 0, trackedItems: 0, hasEnoughData: false };
  }

  const now = new Date();
  const monthBuckets = new Map<string, Map<string, number[]>>();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthBuckets.set(key, new Map());
  }

  for (const item of items) {
    const monthKey = item.receiptDate.slice(0, 7);
    if (!monthBuckets.has(monthKey)) continue;
    const bucket = monthBuckets.get(monthKey)!;
    const itemKey = normalizeItemName(item.name);
    const prices = bucket.get(itemKey) ?? [];
    prices.push(item.price);
    bucket.set(itemKey, prices);
  }

  const itemFirstMonth = new Map<string, string>();
  for (const item of items) {
    const key = normalizeItemName(item.name);
    const month = item.receiptDate.slice(0, 7);
    const existing = itemFirstMonth.get(key);
    if (!existing || month < existing) itemFirstMonth.set(key, month);
  }

  const baseMonth = [...monthBuckets.keys()].sort()[0];
  const baseAverages = new Map<string, number>();
  const baseBucket = monthBuckets.get(baseMonth);
  if (baseBucket) {
    for (const [itemKey, prices] of baseBucket) {
      baseAverages.set(itemKey, prices.reduce((s, p) => s + p, 0) / prices.length);
    }
  }

  const points: InflationDataPoint[] = [];
  const sortedMonths = [...monthBuckets.keys()].sort();

  for (const monthKey of sortedMonths) {
    const bucket = monthBuckets.get(monthKey)!;
    const ratios: number[] = [];

    for (const [itemKey, prices] of bucket) {
      const base = baseAverages.get(itemKey);
      if (!base || base <= 0) continue;
      const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
      ratios.push(avg / base);
    }

    if (ratios.length === 0) continue;
    const avgRatio = ratios.reduce((s, r) => s + r, 0) / ratios.length;
    const label = new Date(monthKey + '-01T12:00:00').toLocaleDateString(undefined, {
      month: 'short',
    });
    points.push({ label, index: Math.round(avgRatio * 100), monthKey });
  }

  const trackedItems = itemFirstMonth.size;
  const hasEnoughData = points.length >= 2 && trackedItems >= 2;
  const currentIndex = points.length > 0 ? points[points.length - 1].index : 100;
  const firstIndex = points.length > 0 ? points[0].index : 100;
  const changePercent = firstIndex > 0 ? ((currentIndex - firstIndex) / firstIndex) * 100 : 0;

  return { points, currentIndex, changePercent, trackedItems, hasEnoughData };
}

export async function getUsageStats(): Promise<UsageStats> {
  const { getAllLists, getAllComparisons } = await import('@/src/services/storageService');
  const items = await getReceiptItemsWithStore();
  const receipts = await getReceiptsInDateRange('1970-01-01', todayISO());
  const lists = await getAllLists();
  const comparisons = await getAllComparisons();

  const dates = receipts.map((r) => r.date).sort();
  const totalSpent = receipts.reduce((s, r) => s + getReceiptDisplayTotal(r), 0);
  const stores = new Set(receipts.map((r) => r.storeName.toLowerCase()));

  return {
    receiptCount: receipts.length,
    listCount: lists.length,
    itemLineCount: items.length,
    comparisonCount: comparisons.length,
    firstReceiptDate: dates[0] ?? null,
    lastReceiptDate: dates[dates.length - 1] ?? null,
    totalSpent,
    avgReceiptTotal: receipts.length > 0 ? totalSpent / receipts.length : 0,
    storesVisited: stores.size,
  };
}

