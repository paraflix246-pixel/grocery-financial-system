import {
  getWalmartItemByCanonical,
  getWalmartItemEmoji,
  getWalmartTypicalPrice,
  POPULAR_WALMART_ITEM_NAMES,
  WALMART_GROCERY_CATALOG,
} from '@/src/data/walmartGroceryCatalog';

export type CommonGroceryItem = {
  id: string;
  canonicalName: string;
  category: string;
  expectedPrice: number;
  quantityLabel: string;
  aliases: string[];
  emoji: string;
};

export const COMMON_GROCERY_ITEMS: CommonGroceryItem[] = WALMART_GROCERY_CATALOG.map((item) => ({
  id: item.id,
  canonicalName: item.canonicalName,
  category: item.category,
  expectedPrice: getWalmartTypicalPrice(item),
  quantityLabel: item.unit ?? '1 unit',
  aliases: item.aliases ?? [],
  emoji: item.emoji,
}));

export const POPULAR_ALERT_ITEMS = POPULAR_WALMART_ITEM_NAMES;

export function getCatalogItem(canonicalName: string): CommonGroceryItem | undefined {
  const walmart = getWalmartItemByCanonical(canonicalName);
  if (!walmart) return undefined;
  return COMMON_GROCERY_ITEMS.find(
    (item) => item.canonicalName.toLowerCase() === walmart.canonicalName.toLowerCase()
  );
}

export function getCatalogCanonicalNames(): string[] {
  return COMMON_GROCERY_ITEMS.map((item) => item.canonicalName);
}

export function getItemEmoji(canonicalName?: string, itemName?: string): string {
  return getWalmartItemEmoji(canonicalName, itemName);
}
