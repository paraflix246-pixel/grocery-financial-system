import type { PriceAlertRule } from '@/src/models/types';
import { itemMatchesAlertRule } from '@/src/services/itemNormalizationService';
import type { RotatingItemComparison } from '@/src/services/priceComparisonService';

const PRICE_MATCH_EPSILON = 0.01;

export function findDuplicateAlertRule(
  rules: PriceAlertRule[],
  itemName: string,
  targetPrice: number
): PriceAlertRule | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!itemMatchesAlertRule(rule, itemName)) continue;
    if (Math.abs(rule.targetPrice - targetPrice) <= PRICE_MATCH_EPSILON) return rule;
  }
  return null;
}

export function findStorePriceForComparison(
  comparison: RotatingItemComparison,
  storeName: string
): number | null {
  const storeKey = storeName.trim().toLowerCase();
  const row = comparison.storeRows.find((entry) => entry.store.trim().toLowerCase() === storeKey);
  return row?.price ?? null;
}
