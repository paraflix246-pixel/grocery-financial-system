import {
  getGroceryItemByCanonical,
  getGroceryItemEmoji,
  getGroceryTypicalPrice,
  GROCERY_CATALOG,
  POPULAR_ITEM_NAMES,
} from '@/src/data/groceryCatalog';

export type CommonGroceryItem = {
  id: string;
  canonicalName: string;
  category: string;
  expectedPrice: number;
  quantityLabel: string;
  aliases: string[];
  emoji: string;
};

export const COMMON_GROCERY_ITEMS: CommonGroceryItem[] = GROCERY_CATALOG.map((item) => ({
  id: item.id,
  canonicalName: item.canonicalName,
  category: item.category,
  expectedPrice: getGroceryTypicalPrice(item),
  quantityLabel: item.unit ?? '1 unit',
  aliases: item.aliases ?? [],
  emoji: item.emoji,
}));

export const POPULAR_ALERT_ITEMS = POPULAR_ITEM_NAMES;

export function getCatalogItem(canonicalName: string): CommonGroceryItem | undefined {
  const grocery = getGroceryItemByCanonical(canonicalName);
  if (!grocery) return undefined;
  return COMMON_GROCERY_ITEMS.find(
    (item) => item.canonicalName.toLowerCase() === grocery.canonicalName.toLowerCase()
  );
}

export function getCatalogCanonicalNames(): string[] {
  return COMMON_GROCERY_ITEMS.map((item) => item.canonicalName);
}

export function getItemEmoji(canonicalName?: string, itemName?: string): string {
  return getGroceryItemEmoji(canonicalName, itemName);
}
