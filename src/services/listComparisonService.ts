import type { GroceryList, ListItem } from '@/src/models/types';
import { DEFAULT_STARTER_ITEM_COUNT } from '@/src/data/starterCommonGoods';
import {
  buildSyntheticListItemsFromTracked,
  COMPARISON_FALLBACK_LIST_ID,
  COMPARISON_STARTER_LIST_ID,
} from '@/src/services/comparisonFallbackLogic';
import { pickComparisonListId } from '@/src/services/listComparisonLogic';
import { resolveCanonicalName } from '@/src/services/itemNormalizationService';
import { getEnabledRulesWithCurrentPrice } from '@/src/services/priceAlertService';
import {
  buildRecentReceiptTrackedEntries,
  buildTrackedItems,
  type TrackedItemEntry,
} from '@/src/services/priceTrackerLogic';
import { loadTrackedItems } from '@/src/services/priceTrackerService';
import { hasStarterTrackedItems } from '@/src/services/starterItemsLogic';
import {
  getActiveList,
  getAllLists,
  getListItems,
  getReceiptItemsWithStore,
  setActiveList,
  type ReceiptItemWithStore,
} from '@/src/services/storageService';
import {
  comparisonListCache,
  type ResolvedComparisonList,
} from '@/src/services/listComparisonCache';
import { getHiddenTrackedItemKeys } from '@/src/utils/priceTrackerPreferences';

export type { ResolvedComparisonList } from '@/src/services/listComparisonCache';

function buildFallbackList(id: string, name: string): GroceryList {
  return {
    id,
    name,
    isActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
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

function buildResolvedFallback(
  tracked: TrackedItemEntry[],
  source: ResolvedComparisonList['source']
): ResolvedComparisonList {
  const isStarter = source === 'starter';
  const listId = isStarter ? COMPARISON_STARTER_LIST_ID : COMPARISON_FALLBACK_LIST_ID;
  return {
    list: buildFallbackList(
      listId,
      isStarter ? 'Sample items' : source === 'receipt' ? 'Recent receipt' : 'Watchlist'
    ),
    items: buildSyntheticListItemsFromTracked(tracked, listId),
    source,
  };
}

/** Priority: enabled alerts → recent receipt items → starter samples. */
async function resolveFallbackComparisonItems(): Promise<TrackedItemEntry[]> {
  const [rules, receiptItems, hiddenKeys] = await Promise.all([
    getEnabledRulesWithCurrentPrice(),
    getReceiptItemsWithStore(),
    getHiddenTrackedItemKeys(),
  ]);
  const receiptRows = toReceiptRows(receiptItems);

  if (rules.length > 0) {
    const fromAlerts = buildTrackedItems(rules, [], hiddenKeys, resolveCanonicalName);
    if (fromAlerts.length > 0) return fromAlerts;
  }

  if (receiptRows.length > 0) {
    const fromReceipt = buildRecentReceiptTrackedEntries(
      receiptRows,
      hiddenKeys,
      resolveCanonicalName,
      DEFAULT_STARTER_ITEM_COUNT
    );
    if (fromReceipt.length > 0) return fromReceipt;
  }

  return loadTrackedItems(rules, receiptItems, DEFAULT_STARTER_ITEM_COUNT);
}

/** Resolve which items power home cart comparison (shopping list, then watchlist/receipt/starter fallback). */
export async function resolveComparisonList(
  options?: { forceRefresh?: boolean }
): Promise<ResolvedComparisonList | null> {
  if (!options?.forceRefresh) {
    const cached = comparisonListCache.get('active');
    if (cached !== undefined) return cached;
  }

  const [active, lists] = await Promise.all([getActiveList(), getAllLists()]);

  if (active) {
    const activeItems = await getListItems(active.id);
    if (activeItems.length > 0) {
      const result: ResolvedComparisonList = { list: active, items: activeItems, source: 'list' };
      comparisonListCache.set('active', result);
      return result;
    }
  }

  for (const list of lists) {
    if (active && list.id === active.id) continue;
    const items = await getListItems(list.id);
    if (items.length > 0) {
      if (!active || active.id !== list.id) {
        await setActiveList(list.id);
      }
      const result: ResolvedComparisonList = {
        list: { ...list, isActive: true },
        items,
        source: 'list',
      };
      comparisonListCache.set('active', result);
      return result;
    }
  }

  const tracked = await resolveFallbackComparisonItems();
  if (tracked.length === 0) {
    comparisonListCache.set('active', null);
    return null;
  }

  const source: ResolvedComparisonList['source'] = hasStarterTrackedItems(tracked)
    ? 'starter'
    : tracked.some((entry) => entry.source === 'alert')
      ? 'watchlist'
      : 'receipt';
  const result = buildResolvedFallback(tracked, source);
  comparisonListCache.set('active', result);
  return result;
}

export { invalidateComparisonListCache } from '@/src/services/listComparisonCache';
export { pickComparisonListId } from '@/src/services/listComparisonLogic';
