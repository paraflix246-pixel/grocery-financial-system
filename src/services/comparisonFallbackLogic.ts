import type { ListItem } from '@/src/models/types';
import type { TrackedItemEntry } from '@/src/services/priceTrackerLogic';

export const COMPARISON_FALLBACK_LIST_ID = '__watchlist_comparison__';
export const COMPARISON_STARTER_LIST_ID = '__starter_comparison__';

/** Free/Pro home preview shows exactly this many rotating item comparisons. */
export const HOME_CART_COMPARISON_PREVIEW_COUNT = 2;

/** Demo staples used when the resolved list has fewer than two comparable items. */
export const HOME_PREVIEW_FALLBACK_NAMES = ['Milk', 'Bread', 'Eggs'] as const;

export function ensureHomeComparisonItems(
  items: ListItem[],
  minCount = HOME_CART_COMPARISON_PREVIEW_COUNT
): ListItem[] {
  if (items.length >= minCount) return items;

  const existingNames = new Set(items.map((item) => item.name.trim().toLowerCase()));
  const listId = items[0]?.listId ?? COMPARISON_STARTER_LIST_ID;
  const padded = [...items];

  for (const name of HOME_PREVIEW_FALLBACK_NAMES) {
    if (padded.length >= minCount) break;
    const key = name.toLowerCase();
    if (existingNames.has(key)) continue;
    padded.push({
      id: `${listId}-preview-${key.replace(/[^a-z0-9]+/g, '-')}`,
      listId,
      name,
      expectedPrice: 0,
      quantity: 1,
      category: 'Groceries',
      sortOrder: padded.length,
    });
    existingNames.add(key);
  }

  return padded;
}

export function buildSyntheticListItemsFromTracked(
  entries: TrackedItemEntry[],
  listId: string = COMPARISON_FALLBACK_LIST_ID
): ListItem[] {
  return entries.map((entry, index) => ({
    id: `${listId}-${entry.slug}`,
    listId,
    name: entry.name,
    expectedPrice: 0,
    quantity: 1,
    category: 'Groceries',
    sortOrder: entry.sortOrder ?? index,
  }));
}

export function buildSearchComparisonItem(input: {
  itemName: string;
  canonicalName?: string;
  category?: string;
  quantity?: number;
  listItem?: ListItem;
}): ListItem {
  if (input.listItem) {
    return input.listItem;
  }

  const name = input.itemName.trim();
  const slugBase = (input.canonicalName ?? name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: `${COMPARISON_FALLBACK_LIST_ID}-search-${slugBase || 'item'}`,
    listId: COMPARISON_FALLBACK_LIST_ID,
    name,
    expectedPrice: 0,
    quantity: input.quantity ?? 1,
    category: input.category ?? 'Groceries',
    sortOrder: 0,
  };
}
