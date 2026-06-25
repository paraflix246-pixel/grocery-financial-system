import type { GroceryList } from '@/src/models/types';

/**
 * Pick the list id to use for cart comparison: active list when it has items,
 * otherwise the most recently updated non-empty list (lists are pre-sorted by updated_at DESC).
 */
export function pickComparisonListId(
  lists: GroceryList[],
  activeList: GroceryList | null,
  itemCountByListId: Record<string, number>
): string | null {
  if (activeList) {
    const activeCount = itemCountByListId[activeList.id] ?? 0;
    if (activeCount > 0) return activeList.id;
  }

  for (const list of lists) {
    if (activeList && list.id === activeList.id) continue;
    if ((itemCountByListId[list.id] ?? 0) > 0) return list.id;
  }

  return null;
}
