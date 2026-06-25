import { resolveCanonicalNameExact } from '@/src/services/itemNormalizationService';
import { CUSTOM_ITEM_EMOJI } from '@/src/utils/itemEmojiResolver';
import { inferPantryCategory } from '@/src/utils/pantryCategory';
import { getItemEmoji } from '@/src/data/commonGroceryItems';

export type CustomCatalogEntry = {
  itemKey: string;
  displayName: string;
  canonicalName: string;
  category?: string;
  emoji: string;
  isUserDefined: boolean;
  createdAt: string;
};

export function normalizeCatalogKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildCatalogEntry(name: string, category?: string, createdAt = new Date().toISOString()): CustomCatalogEntry {
  const displayName = name.trim();
  const exactCatalogMatch = resolveCanonicalNameExact(displayName);
  const isUserDefined = !exactCatalogMatch;
  const canonicalName = exactCatalogMatch ?? displayName;
  const resolvedCategory = category?.trim() || inferPantryCategory(displayName, canonicalName);
  const emoji = isUserDefined ? CUSTOM_ITEM_EMOJI : getItemEmoji(canonicalName, displayName);

  return {
    itemKey: normalizeCatalogKey(canonicalName),
    displayName,
    canonicalName,
    category: resolvedCategory,
    emoji,
    isUserDefined,
    createdAt,
  };
}

export function matchesCustomEntry(entry: CustomCatalogEntry, query: string): boolean {
  const key = query.trim().toLowerCase();
  if (!key) return false;
  return (
    entry.displayName.toLowerCase().includes(key) ||
    entry.canonicalName.toLowerCase().includes(key) ||
    (entry.category?.toLowerCase().includes(key) ?? false)
  );
}

export function resolveListItemEmoji(
  itemName: string,
  customCatalogByKey?: ReadonlyMap<string, Pick<CustomCatalogEntry, 'isUserDefined' | 'canonicalName'>>
): string {
  const key = normalizeCatalogKey(itemName);
  const custom = customCatalogByKey?.get(key);

  if (custom?.isUserDefined) return CUSTOM_ITEM_EMOJI;

  const exact = resolveCanonicalNameExact(itemName);
  if (exact) return getItemEmoji(exact, itemName);

  if (custom?.canonicalName) {
    return getItemEmoji(custom.canonicalName, itemName);
  }

  return getItemEmoji(undefined, itemName);
}
