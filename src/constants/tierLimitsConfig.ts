import {
  FREE_MAX_STORES,
  FREE_PANTRY_MAX_ITEMS,
  FREE_PRICE_HISTORY_DAYS,
  FREE_RECEIPT_SCAN_LIMIT,
} from '@/src/constants/proPricing';
import type { SubscriptionTier } from '@/src/store/useSubscriptionStore';

export type TierGatedFeature =
  | 'insights_pro'
  | 'inflation_tracker'
  | 'community_pricing'
  | 'usage_analytics'
  | 'api_access'
  | 'family_plans'
  | 'price_drop_alerts'
  | 'export_advanced'
  | 'multi_user_sync'
  | 'budget_forecasting'
  | 'cheapest_basket';

export type TierLimitConfig = {
  receiptsPerMonth: number | null;
  pantryMaxItems: number | null;
  priceHistoryDays: number | null;
  maxStores: number | null;
  realTimeAlerts: boolean;
  multiStoreComparison: boolean;
  familyLists: boolean;
  spendingBreakdowns: boolean;
  inflationDashboard: boolean;
  multiUserSync: boolean;
  budgetForecasting: boolean;
  cheapestBasket: boolean;
  csvExport: boolean;
};

const FREE_LIMITS: TierLimitConfig = {
  receiptsPerMonth: FREE_RECEIPT_SCAN_LIMIT,
  pantryMaxItems: FREE_PANTRY_MAX_ITEMS,
  priceHistoryDays: FREE_PRICE_HISTORY_DAYS,
  maxStores: FREE_MAX_STORES,
  realTimeAlerts: false,
  multiStoreComparison: false,
  familyLists: false,
  spendingBreakdowns: false,
  inflationDashboard: false,
  multiUserSync: false,
  budgetForecasting: false,
  cheapestBasket: false,
  csvExport: false,
};

const PRO_LIMITS: TierLimitConfig = {
  receiptsPerMonth: null,
  pantryMaxItems: null,
  priceHistoryDays: null,
  maxStores: null,
  realTimeAlerts: true,
  multiStoreComparison: true,
  familyLists: true,
  spendingBreakdowns: true,
  inflationDashboard: true,
  multiUserSync: false,
  budgetForecasting: false,
  cheapestBasket: false,
  csvExport: false,
};

const HOUSEHOLD_LIMITS: TierLimitConfig = {
  ...PRO_LIMITS,
  multiUserSync: true,
  budgetForecasting: true,
  cheapestBasket: true,
  csvExport: true,
};

export const TIER_LIMITS: Record<SubscriptionTier, TierLimitConfig> = {
  free: FREE_LIMITS,
  pro: PRO_LIMITS,
  household: HOUSEHOLD_LIMITS,
};

export function getTierLimits(tier: SubscriptionTier): TierLimitConfig {
  return TIER_LIMITS[tier];
}

export function tierAllowsFeature(feature: TierGatedFeature, limits: TierLimitConfig): boolean {
  switch (feature) {
    case 'usage_analytics':
      return limits.priceHistoryDays == null;
    case 'insights_pro':
      return limits.spendingBreakdowns;
    case 'inflation_tracker':
      return limits.inflationDashboard;
    case 'community_pricing':
    case 'api_access':
      return limits.multiStoreComparison;
    case 'family_plans':
      return limits.familyLists;
    case 'price_drop_alerts':
      return limits.realTimeAlerts;
    case 'export_advanced':
      return limits.csvExport;
    case 'multi_user_sync':
      return limits.multiUserSync;
    case 'budget_forecasting':
      return limits.budgetForecasting;
    case 'cheapest_basket':
      return limits.cheapestBasket;
    default:
      return true;
  }
}

type StoreRow = { store: string; isCheapest?: boolean };

/** Limit multi-store rows to a single store on the free plan. */
export function limitStoreRowsForTier<T extends StoreRow>(
  rows: T[],
  multiStoreUnlocked: boolean
): T[] {
  if (multiStoreUnlocked || rows.length <= 1) return rows;
  const cheapest = rows.find((row) => row.isCheapest) ?? rows[0];
  return cheapest ? [cheapest] : rows.slice(0, 1);
}

export function filterRowsByCutoffDate<T extends { date: string }>(rows: T[], cutoff: string | null): T[] {
  if (!cutoff) return rows;
  return rows.filter((row) => row.date >= cutoff);
}

export function filterReceiptRowsByCutoffDate<T extends { receiptDate: string }>(
  rows: T[],
  cutoff: string | null
): T[] {
  if (!cutoff) return rows;
  return rows.filter((row) => row.receiptDate >= cutoff);
}

export function priceHistoryCutoffFromDays(maxDays: number | null): string | null {
  if (maxDays == null) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  return cutoff.toISOString().split('T')[0];
}
