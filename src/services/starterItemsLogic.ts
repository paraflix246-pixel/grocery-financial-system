import { getItemEmoji } from '@/src/data/commonGroceryItems';
import {
  buildStarterItemSeed,
  DEFAULT_STARTER_ITEM_COUNT,
  pickStarterItemNames,
  STARTER_ITEM_POOL,
} from '@/src/data/starterCommonGoods';
import {
  isTrackedItemHidden,
  normalizeTrackedItemKey,
  type ReceiptItemRow,
  type ResolveCanonicalName,
  type TrackedItemEntry,
  type TrackedItemRule,
  toTrackedItemSlug,
} from '@/src/services/priceTrackerLogic';

export type StarterVisibilityOptions = {
  startersDismissed?: boolean;
};

export function shouldShowStarterTrackedItems(
  rules: readonly TrackedItemRule[],
  receiptItems: readonly ReceiptItemRow[],
  options: StarterVisibilityOptions = {}
): boolean {
  if (rules.length > 0) return false;
  if (receiptItems.length > 0) return false;
  if (options.startersDismissed) return false;
  return true;
}

export function areStarterItemsFullyHidden(
  starterNames: readonly string[],
  hiddenKeys: ReadonlySet<string>,
  resolveCanonical: ResolveCanonicalName
): boolean {
  if (starterNames.length === 0) return false;
  return starterNames.every((name) => isTrackedItemHidden(name, hiddenKeys, resolveCanonical));
}

export function hasStarterTrackedItems(items: readonly TrackedItemEntry[]): boolean {
  return items.some((item) => item.source === 'starter');
}

export function createStarterItemNames(
  count = DEFAULT_STARTER_ITEM_COUNT,
  seed = buildStarterItemSeed()
): string[] {
  return pickStarterItemNames(STARTER_ITEM_POOL, count, seed);
}

export function buildStarterTrackedEntries(
  names: readonly string[],
  hiddenKeys: ReadonlySet<string>,
  resolveCanonical: ResolveCanonicalName,
  maxItems = DEFAULT_STARTER_ITEM_COUNT
): TrackedItemEntry[] {
  const seen = new Set<string>();
  const entries: TrackedItemEntry[] = [];

  for (const name of names) {
    if (entries.length >= maxItems) break;
    const key = normalizeTrackedItemKey(name, resolveCanonical);
    if (!key || seen.has(key) || isTrackedItemHidden(name, hiddenKeys, resolveCanonical)) continue;
    seen.add(key);
    entries.push({
      slug: toTrackedItemSlug(name),
      name,
      emoji: getItemEmoji(name, name),
      source: 'starter',
      alertRuleIds: [],
      sortOrder: entries.length,
    });
  }

  return entries;
}
