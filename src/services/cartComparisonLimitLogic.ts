import { FREE_MAX_STORES } from '@/src/constants/proPricing';
import { limitStoreRowsForTier } from '@/src/constants/tierLimitsConfig';
import type { ListItem } from '@/src/models/types';
import {
  ensureHomeComparisonItems,
  HOME_CART_COMPARISON_PREVIEW_COUNT,
} from '@/src/services/comparisonFallbackLogic';

/** Max rotating item comparisons for free-tier accounts. */
export const FREE_CART_COMPARISON_ITEM_LIMIT = HOME_CART_COMPARISON_PREVIEW_COUNT;

/** Max store price rows per item comparison for free-tier accounts. */
export const FREE_CART_COMPARISON_STORE_LIMIT = FREE_MAX_STORES;

export type CartComparisonLimitResult = {
  itemsForComparison: ListItem[];
  totalListItemCount: number;
  /** null when Pro/Household/admin has full cart comparison. */
  comparisonLimit: number | null;
};

export function shouldShowLimitedComparisonMeta(
  hasFullAccess: boolean,
  comparisonLimit: number | null,
  totalListItemCount: number
): boolean {
  return !hasFullAccess && comparisonLimit != null && totalListItemCount > comparisonLimit;
}

/** Pro upgrade banner above home cart comparison — not gated on subscription load. */
export function shouldShowCartComparisonUpgradeBanner(input: {
  hasFullAccess: boolean;
  comparisonLimit: number | null;
  totalListItemCount: number;
  comparisonsCount: number;
}): boolean {
  const { hasFullAccess, comparisonLimit, totalListItemCount, comparisonsCount } = input;
  if (hasFullAccess || comparisonLimit == null) return false;
  if (totalListItemCount > comparisonLimit) return true;
  return comparisonsCount > 0;
}

export function getCartComparisonStoreRowLimit(hasFullAccess: boolean): number | null {
  return hasFullAccess ? null : FREE_CART_COMPARISON_STORE_LIMIT;
}

export function shouldShowLimitedStoreComparisonMeta(
  hasFullAccess: boolean,
  totalStoreCount: number
): boolean {
  return !hasFullAccess && totalStoreCount > FREE_CART_COMPARISON_STORE_LIMIT;
}

/** Green Pro store slot beside the free-tier store preview (Aldi | Kroger | Upgrade). */
export function shouldShowStoreComparisonUpgradeCard(
  hasFullAccess: boolean,
  totalStoreCount: number,
  displayStoreCount: number
): boolean {
  if (hasFullAccess) return false;
  return (
    displayStoreCount >= FREE_CART_COMPARISON_STORE_LIMIT &&
    totalStoreCount > displayStoreCount
  );
}

/** Keep cheapest store visible; cap additional stores for free cart comparison. */
export function applyCartComparisonStoreRowLimit<T extends { store: string; isCheapest?: boolean }>(
  rows: T[],
  hasFullAccess: boolean
): T[] {
  if (hasFullAccess) return rows;
  return limitStoreRowsForTier(rows, false, FREE_CART_COMPARISON_STORE_LIMIT);
}

export function applyCartComparisonItemLimit(
  listItems: ListItem[],
  hasFullAccess: boolean
): CartComparisonLimitResult {
  const totalListItemCount = listItems.length;
  if (hasFullAccess) {
    return {
      itemsForComparison: listItems,
      totalListItemCount,
      comparisonLimit: null,
    };
  }

  return {
    itemsForComparison: ensureHomeComparisonItems(
      listItems,
      FREE_CART_COMPARISON_ITEM_LIMIT
    ).slice(0, FREE_CART_COMPARISON_ITEM_LIMIT),
    totalListItemCount,
    comparisonLimit: FREE_CART_COMPARISON_ITEM_LIMIT,
  };
}
