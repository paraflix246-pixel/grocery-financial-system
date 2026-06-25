import type { GroceryList } from '@/src/models/types';

export const DEFAULT_NEW_LIST_NAME = 'List 1';

const LEGACY_DEFAULT_LIST_NAMES = new Set(['weekly shopping', 'shopping list', 'my shopping list']);

const LEGACY_MY_SHOPPING_LIST = /^my shopping list(?:\s+\d+)?$/i;

export function isNumberedListName(name: string): boolean {
  return /^List \d+$/i.test(name.trim());
}

function isLegacyDefaultListName(name: string): boolean {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  return LEGACY_DEFAULT_LIST_NAMES.has(lower) || LEGACY_MY_SHOPPING_LIST.test(trimmed);
}

export function suggestNewListName(lists: GroceryList[]): string {
  const usedNumbers = new Set<number>();
  for (const list of lists) {
    const match = list.name.trim().match(/^List (\d+)$/i);
    if (match) usedNumbers.add(Number(match[1]));
  }
  let index = 1;
  while (usedNumbers.has(index)) {
    index += 1;
  }
  return `List ${index}`;
}

export function migrateLegacyListNames(lists: GroceryList[]): { lists: GroceryList[]; changed: boolean } {
  let changed = false;
  const result = lists.map((list) => ({ ...list }));
  const order = result
    .map((list, index) => ({ list, index }))
    .sort(
      (a, b) =>
        new Date(a.list.createdAt).getTime() - new Date(b.list.createdAt).getTime()
    );

  for (const { index } of order) {
    const current = result[index].name;
    if (!isLegacyDefaultListName(current)) continue;
    const others = result.filter((_, i) => i !== index);
    const newName = suggestNewListName(others);
    if (newName !== current) {
      result[index] = { ...result[index], name: newName };
      changed = true;
    }
  }

  return { lists: result, changed };
}
