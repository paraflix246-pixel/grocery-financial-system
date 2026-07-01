import type { GroceryList, ListItem, Receipt } from '@/src/models/types';
import { DEFAULT_STARTER_ITEM_COUNT } from '@/src/data/starterCommonGoods';
import {
  buildSyntheticListItemsFromTracked,
  COMPARISON_FALLBACK_LIST_ID,
  COMPARISON_STARTER_LIST_ID,
} from '@/src/services/comparisonFallbackLogic';
import { pickComparisonListId, receiptRowsFromReceipts } from '@/src/services/listComparisonLogic';
import { resolveCanonicalName } from '@/src/services/itemNormalizationService';
import { getEnabledRulesWithCurrentPrice } from '@/src/services/priceAlertService';
import {
  buildRecentReceiptTrackedEntries,
  buildTrackedItems,
  type ReceiptItemRow,
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

function toReceiptRows(items: ReceiptItemWithStore[]): ReceiptItemRow[] {
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

type FallbackComparisonOptions = {
  /** When set, receipt fallback uses household receipts instead of personal SQLite. */
  scopedReceiptRows?: ReceiptItemRow[];
  /** Personal watchlist alerts apply only in personal scope. */
  includePersonalWatchlist?: boolean;
  /** Skip receipt rows when receipts were already resolved upstream. */
  skipReceipts?: boolean;
};

/** Priority: enabled alerts → recent receipt items → starter samples. */
async function resolveFallbackComparisonItems(
  options: FallbackComparisonOptions = {}
): Promise<TrackedItemEntry[]> {
  const includePersonalWatchlist = options.includePersonalWatchlist !== false;
  const hiddenKeys = await getHiddenTrackedItemKeys();

  let receiptRows = options.scopedReceiptRows;
  let receiptItems: ReceiptItemWithStore[] = [];
  if (!options.skipReceipts) {
    if (!receiptRows) {
      receiptItems = await getReceiptItemsWithStore();
      receiptRows = toReceiptRows(receiptItems);
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
  }

  if (includePersonalWatchlist) {
    const rules = await getEnabledRulesWithCurrentPrice();
    if (rules.length > 0) {
      const fromAlerts = buildTrackedItems(rules, [], hiddenKeys, resolveCanonicalName);
      if (fromAlerts.length > 0) return fromAlerts;
    }
  }

  if (includePersonalWatchlist) {
    const rules = await getEnabledRulesWithCurrentPrice();
    return loadTrackedItems(rules, receiptItems, DEFAULT_STARTER_ITEM_COUNT);
  }

  return loadTrackedItems([], [], DEFAULT_STARTER_ITEM_COUNT);
}

async function resolveReceiptComparisonTracked(
  scopedReceiptRows?: ReceiptItemRow[]
): Promise<TrackedItemEntry[]> {
  const hiddenKeys = await getHiddenTrackedItemKeys();
  let receiptRows = scopedReceiptRows;
  if (!receiptRows) {
    receiptRows = toReceiptRows(await getReceiptItemsWithStore());
  }
  if (receiptRows.length === 0) return [];
  return buildRecentReceiptTrackedEntries(
    receiptRows,
    hiddenKeys,
    resolveCanonicalName,
    DEFAULT_STARTER_ITEM_COUNT
  );
}

export type ResolveComparisonListOptions = {
  forceRefresh?: boolean;
  /** Cache partition — defaults to personal scope. */
  scopeKey?: string;
  /** Saved receipts for the active scope (personal SQLite or household Supabase). */
  scopedReceipts?: Receipt[];
};

function resolveComparisonCacheKey(options?: ResolveComparisonListOptions): string {
  return options?.scopeKey ?? 'personal';
}

/** Resolve which items power home cart comparison (receipts, then shopping list, then watchlist/starter fallback). */
export async function resolveComparisonList(
  options?: ResolveComparisonListOptions
): Promise<ResolvedComparisonList | null> {
  const cacheKey = resolveComparisonCacheKey(options);
  const isWorkspaceScope = resolveComparisonCacheKey(options).startsWith('workspace:');
  if (!options?.forceRefresh) {
    const cached = comparisonListCache.get(cacheKey);
    if (cached !== undefined) return cached;
  }

  const scopedReceiptRows = options?.scopedReceipts
    ? receiptRowsFromReceipts(options.scopedReceipts)
    : undefined;

  const receiptTracked = await resolveReceiptComparisonTracked(scopedReceiptRows);
  if (receiptTracked.length > 0) {
    const result = buildResolvedFallback(receiptTracked, 'receipt');
    comparisonListCache.set(cacheKey, result);
    return result;
  }

  const [active, lists] = await Promise.all([getActiveList(), getAllLists()]);

  if (active) {
    const activeItems = await getListItems(active.id);
    if (activeItems.length > 0) {
      const result: ResolvedComparisonList = { list: active, items: activeItems, source: 'list' };
      comparisonListCache.set(cacheKey, result);
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
      comparisonListCache.set(cacheKey, result);
      return result;
    }
  }

  const tracked = await resolveFallbackComparisonItems({
    includePersonalWatchlist: !isWorkspaceScope,
    skipReceipts: true,
  });
  if (tracked.length === 0) {
    comparisonListCache.set(cacheKey, null);
    return null;
  }

  const source: ResolvedComparisonList['source'] = hasStarterTrackedItems(tracked)
    ? 'starter'
    : tracked.some((entry) => entry.source === 'alert')
      ? 'watchlist'
      : 'receipt';
  const result = buildResolvedFallback(tracked, source);
  comparisonListCache.set(cacheKey, result);
  return result;
}

export { invalidateComparisonListCache } from '@/src/services/listComparisonCache';
export { pickComparisonListId, receiptRowsFromReceipts } from '@/src/services/listComparisonLogic';
