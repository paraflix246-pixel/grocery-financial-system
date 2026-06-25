import type { PriceAlertRule } from '@/src/models/types';
import {
  invalidatePriceAlertCache,
  type RuleWithCurrentPrice,
} from '@/src/services/priceAlertService';
import { itemMatchesAlertRule, resolveCanonicalName } from '@/src/services/itemNormalizationService';
import { buildTrackedItems } from '@/src/services/priceTrackerLogic';
import {
  areStarterItemsFullyHidden,
  buildStarterTrackedEntries,
  createStarterItemNames,
  shouldShowStarterTrackedItems,
} from '@/src/services/starterItemsLogic';
import { DEFAULT_STARTER_ITEM_COUNT } from '@/src/data/starterCommonGoods';
import {
  getOrCreateStarterItemNames,
  getStartersDismissed,
  setStartersDismissed,
} from '@/src/services/starterItemsStorage';
import {
  getPriceAlertRules,
  savePriceAlertRule,
  type ReceiptItemWithStore,
} from '@/src/services/storageService';
import {
  getHiddenTrackedItemKeys,
  hideTrackedItem,
} from '@/src/utils/priceTrackerPreferences';
import { invalidateComparisonListCache } from '@/src/services/listComparisonCache';

export type { TrackedItemEntry } from '@/src/services/priceTrackerLogic';
export { buildTrackedItems, toTrackedItemSlug } from '@/src/services/priceTrackerLogic';

function findMatchingAlertRules(rules: PriceAlertRule[], itemName: string): PriceAlertRule[] {
  return rules.filter((rule) => itemMatchesAlertRule(rule, itemName));
}

function toReceiptRows(items: ReceiptItemWithStore[]) {
  return items.map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    storeName: item.storeName,
    receiptDate: item.receiptDate,
  }));
}

async function buildStarterTrackedItems(
  hiddenKeys: ReadonlySet<string>,
  maxItems: number,
  startersDismissed: boolean
) {
  if (!shouldShowStarterTrackedItems([], [], { startersDismissed })) {
    return [];
  }

  const count = Math.min(maxItems, DEFAULT_STARTER_ITEM_COUNT);
  const persistedNames = await getOrCreateStarterItemNames(count);
  let entries = buildStarterTrackedEntries(persistedNames, hiddenKeys, resolveCanonicalName, maxItems);

  if (entries.length === 0) {
    entries = buildStarterTrackedEntries(
      createStarterItemNames(count),
      hiddenKeys,
      resolveCanonicalName,
      maxItems
    );
  }

  return entries;
}

export async function stopTrackingItem(itemName: string): Promise<{ disabledAlertCount: number }> {
  await hideTrackedItem(itemName);

  const rules = await getPriceAlertRules();
  const matching = findMatchingAlertRules(rules, itemName);
  let disabledAlertCount = 0;

  for (const rule of matching) {
    if (!rule.enabled) continue;
    await savePriceAlertRule({ ...rule, enabled: false });
    disabledAlertCount += 1;
  }

  if (disabledAlertCount > 0) {
    invalidatePriceAlertCache();
  }

  const hiddenKeys = await getHiddenTrackedItemKeys();
  const starterNames = await getOrCreateStarterItemNames(DEFAULT_STARTER_ITEM_COUNT);
  if (areStarterItemsFullyHidden(starterNames, hiddenKeys, resolveCanonicalName)) {
    await setStartersDismissed(true);
  }

  invalidateComparisonListCache();

  return { disabledAlertCount };
}

export async function loadTrackedItems(
  rules: RuleWithCurrentPrice[],
  receiptItems: ReceiptItemWithStore[],
  maxItems = 12
): Promise<import('@/src/services/priceTrackerLogic').TrackedItemEntry[]> {
  const hiddenKeys = await getHiddenTrackedItemKeys();
  const receiptRows = toReceiptRows(receiptItems);
  const tracked = buildTrackedItems(rules, receiptRows, hiddenKeys, resolveCanonicalName, maxItems);
  if (tracked.length > 0) return tracked;

  const startersDismissed = await getStartersDismissed();
  return buildStarterTrackedItems(hiddenKeys, maxItems, startersDismissed);
}
