import {
  FREE_MAX_STORES,
  FREE_PANTRY_MAX_ITEMS,
} from '@/src/constants/proPricing';
import {
  filterReceiptRowsByCutoffDate,
  filterRowsByCutoffDate,
  getTierLimits,
  limitStoreRowsForTier,
  priceHistoryCutoffFromDays,
  tierAllowsFeature,
  TIER_LIMITS,
  type TierLimitConfig,
} from '@/src/constants/tierLimitsConfig';
import type { GatedFeature } from '@/src/services/featureGateService';
import { canAccessFeature, hasProInCurrentScopeFromStores } from '@/src/services/featureGateService';
import { getPantryItems, getReceipts } from '@/src/services/storageService';
import { useSubscriptionStore, type SubscriptionTier } from '@/src/store/useSubscriptionStore';
import { normalizeReceiptDate } from '@/src/utils/dateParser';

export {
  getTierLimits,
  limitStoreRowsForTier,
  tierAllowsFeature,
  TIER_LIMITS,
  type TierLimitConfig,
};

export function getCurrentTierLimits(): TierLimitConfig {
  if (hasProInCurrentScopeFromStores()) {
    return getTierLimits('pro');
  }
  return getTierLimits(useSubscriptionStore.getState().getEffectiveTier());
}

export class ScanLimitError extends Error {
  readonly code = 'scan_limit' as const;

  constructor(message = 'Monthly receipt scan limit reached') {
    super(message);
    this.name = 'ScanLimitError';
  }
}

export class PantryLimitError extends Error {
  readonly code = 'pantry_limit' as const;

  constructor(
    message = `Pantry limit reached (${FREE_PANTRY_MAX_ITEMS} items on Free)`,
    readonly count = FREE_PANTRY_MAX_ITEMS,
    readonly limit = FREE_PANTRY_MAX_ITEMS
  ) {
    super(message);
    this.name = 'PantryLimitError';
  }
}

export class StoreLimitError extends Error {
  readonly code = 'store_limit' as const;

  constructor(
    readonly primaryStore: string | null,
    message = primaryStore
      ? `Free plans track up to ${FREE_MAX_STORES} stores (${primaryStore} is your main store). Upgrade for multi-store comparison.`
      : `Free plans track up to ${FREE_MAX_STORES} stores. Upgrade for multi-store comparison.`
  ) {
    super(message);
    this.name = 'StoreLimitError';
  }
}

/** Max days of price history for the current tier, or null for unlimited. */
export function getMaxPriceHistoryDays(): number | null {
  return getCurrentTierLimits().priceHistoryDays;
}

export function getPriceHistoryCutoffDate(): string | null {
  return priceHistoryCutoffFromDays(getMaxPriceHistoryDays());
}

export function filterByPriceHistoryTier<T extends { date: string }>(rows: T[]): T[] {
  const cutoff = getPriceHistoryCutoffDate();
  if (!cutoff) return rows;
  return filterRowsByCutoffDate(
    rows.map((row) => ({ ...row, date: normalizeReceiptDate(row.date) })),
    cutoff
  );
}

export function filterReceiptDatesByTier<T extends { receiptDate: string }>(rows: T[]): T[] {
  const cutoff = getPriceHistoryCutoffDate();
  if (!cutoff) return rows;
  return filterReceiptRowsByCutoffDate(
    rows.map((row) => ({ ...row, receiptDate: normalizeReceiptDate(row.receiptDate) })),
    cutoff
  );
}

let primaryStoreCache: string | null | undefined;

/** Distinct store names from receipts, ordered by scan count (highest first). */
export async function getTrackedStoreNames(): Promise<string[]> {
  const receipts = await getReceipts();
  const counts = new Map<string, number>();
  for (const receipt of receipts) {
    const store = receipt.storeName.trim();
    if (!store) continue;
    counts.set(store, (counts.get(store) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([store]) => store);
}

/** Most-scanned store name for free-tier store tracking. */
export async function getPrimaryStoreName(): Promise<string | null> {
  if (primaryStoreCache !== undefined) return primaryStoreCache;

  const tracked = await getTrackedStoreNames();
  if (tracked.length === 0) {
    primaryStoreCache = null;
    return null;
  }

  primaryStoreCache = tracked[0];
  return primaryStoreCache;
}

export function invalidatePrimaryStoreCache(): void {
  primaryStoreCache = undefined;
}

export async function storesMatchForTier(a: string, b: string): Promise<boolean> {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  if (left.trim().toLowerCase() === right.trim().toLowerCase()) return true;

  const { matchStoreByName } = await import('@/src/services/storeService');
  const matchedLeft = matchStoreByName(left);
  const matchedRight = matchStoreByName(right);
  if (matchedLeft && matchedRight) {
    return matchedLeft.id === matchedRight.id;
  }
  return false;
}

export async function canTrackStore(storeName: string): Promise<{ allowed: boolean; primaryStore: string | null }> {
  const limits = getCurrentTierLimits();
  if (limits.maxStores == null) {
    return { allowed: true, primaryStore: null };
  }

  const trimmed = storeName.trim();
  if (!trimmed) {
    return { allowed: true, primaryStore: null };
  }

  const trackedStores = await getTrackedStoreNames();
  const primaryStore = trackedStores[0] ?? null;

  for (const tracked of trackedStores) {
    if (await storesMatchForTier(trimmed, tracked)) {
      return { allowed: true, primaryStore };
    }
  }

  if (trackedStores.length < limits.maxStores) {
    return { allowed: true, primaryStore };
  }

  return { allowed: false, primaryStore };
}

export async function assertCanTrackStore(storeName: string): Promise<void> {
  const status = await canTrackStore(storeName);
  if (!status.allowed) {
    throw new StoreLimitError(status.primaryStore);
  }
}

export type PantryLimitStatus = {
  allowed: boolean;
  count: number;
  limit: number | null;
  remaining: number | null;
};

export async function getPantryLimitStatus(): Promise<PantryLimitStatus> {
  const limit = getCurrentTierLimits().pantryMaxItems;
  const count = (await getPantryItems()).length;

  if (limit == null) {
    return { allowed: true, count, limit: null, remaining: null };
  }

  const remaining = Math.max(0, limit - count);
  return {
    allowed: count < limit,
    count,
    limit,
    remaining,
  };
}

export async function canAddPantryItem(canonicalKey?: string): Promise<boolean> {
  const limit = getCurrentTierLimits().pantryMaxItems;
  if (limit == null) return true;

  if (canonicalKey) {
    const key = canonicalKey.trim().toLowerCase();
    const existing = (await getPantryItems()).some(
      (item) => (item.canonicalName ?? item.name).trim().toLowerCase() === key
    );
    if (existing) return true;
  }

  const status = await getPantryLimitStatus();
  return status.allowed;
}

export async function assertCanAddPantryItem(canonicalKey?: string): Promise<void> {
  const allowed = await canAddPantryItem(canonicalKey);
  if (!allowed) {
    const status = await getPantryLimitStatus();
    throw new PantryLimitError(undefined, status.count, status.limit ?? FREE_PANTRY_MAX_ITEMS);
  }
}

export function isFeatureUnlocked(feature: GatedFeature): boolean {
  return canAccessFeature(feature);
}
