import type { GroceryList } from '@/src/models/types';
import { isNumberedListName } from '@/src/utils/shoppingListCreate';
import { formatDisplayDate } from '@/src/utils/dateParser';
export function getListItemCount(listId: string, itemsByList: Record<string, unknown[]>): number {
  return itemsByList[listId]?.length ?? 0;
}

export function buildListDifferentiator(
  list: GroceryList,
  allLists: GroceryList[],
  itemCount: number
): string | undefined {
  if (isNumberedListName(list.name)) return undefined;
  const duplicateNames = allLists.filter((entry) => entry.name === list.name).length;
  if (duplicateNames <= 1) return undefined;
  if (itemCount > 0) {
    return `${itemCount} item${itemCount === 1 ? '' : 's'} · Updated ${formatDisplayDate(list.updatedAt)}`;
  }
  return `Empty · Created ${formatDisplayDate(list.createdAt)}`;
}

/** Numbered lists (List 1, List 2…) first in order, then custom names by creation date. */
export function sortListsForDisplay(lists: GroceryList[]): GroceryList[] {
  return [...lists].sort((a, b) => {
    const aMatch = a.name.trim().match(/^List (\d+)$/i);
    const bMatch = b.name.trim().match(/^List (\d+)$/i);
    if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1]);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export type PartitionedLists = {
  activeList: GroceryList | null;
  populatedLists: GroceryList[];
  emptyLists: GroceryList[];
};

export function partitionLists(
  lists: GroceryList[],
  activeListId: string | null,
  itemsByList: Record<string, unknown[]>
): PartitionedLists {
  const activeList = activeListId ? (lists.find((list) => list.id === activeListId) ?? null) : null;
  const others = lists
    .filter((list) => list.id !== activeListId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const populatedLists: GroceryList[] = [];
  const emptyLists: GroceryList[] = [];

  for (const list of others) {
    if (getListItemCount(list.id, itemsByList) === 0) {
      emptyLists.push(list);
    } else {
      populatedLists.push(list);
    }
  }

  return { activeList, populatedLists, emptyLists };
}
