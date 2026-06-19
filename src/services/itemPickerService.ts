import {
  COMMON_GROCERY_ITEMS,
  getCatalogItem,
  getItemEmoji,
  POPULAR_ALERT_ITEMS,
  type CommonGroceryItem,
} from '@/src/data/commonGroceryItems';
import {
  GROCERY_CATALOG_LABEL,
  searchGroceryCatalog,
} from '@/src/data/groceryCatalog';
import { resolveCanonicalName, suggestTargetPrice } from '@/src/services/itemNormalizationService';
import { getReceiptItemsWithStore } from '@/src/services/storageService';

export type ItemPickerOption = {
  canonicalName: string;
  displayName: string;
  source: 'history' | 'catalog' | 'both';
  lastPrice?: number;
  storeName?: string;
  receiptDate?: string;
  catalogPrice?: number;
  category?: string;
  emoji: string;
};

export type ItemPickerSelection = {
  itemName: string;
  canonicalName?: string;
  emoji?: string;
  lastSeen?: {
    price: number;
    storeName: string;
    receiptDate: string;
  };
  suggestedTargetPrice?: number;
};

export { GROCERY_CATALOG_LABEL };

function toOptionFromCatalog(item: CommonGroceryItem, source: ItemPickerOption['source']): ItemPickerOption {
  return {
    canonicalName: item.canonicalName,
    displayName: item.canonicalName,
    source,
    catalogPrice: item.expectedPrice,
    category: item.category,
    emoji: item.emoji,
  };
}

function matchesQuery(option: ItemPickerOption, query: string): boolean {
  const catalog = getCatalogItem(option.canonicalName);
  const haystack = [
    option.displayName,
    option.canonicalName,
    option.category ?? '',
    ...(catalog?.aliases ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export async function loadItemPickerOptions(): Promise<ItemPickerOption[]> {
  const receiptItems = await getReceiptItemsWithStore();
  const byCanonical = new Map<string, ItemPickerOption>();

  for (const catalogItem of COMMON_GROCERY_ITEMS) {
    byCanonical.set(catalogItem.canonicalName.toLowerCase(), toOptionFromCatalog(catalogItem, 'catalog'));
  }

  for (const item of receiptItems) {
    const canonical = resolveCanonicalName(item.name) ?? item.name.trim();
    const key = canonical.toLowerCase();
    const existing = byCanonical.get(key);
    const catalog = getCatalogItem(canonical);

    if (!existing) {
      byCanonical.set(key, {
        canonicalName: canonical,
        displayName: catalog?.canonicalName ?? item.name.trim(),
        source: 'history',
        lastPrice: item.price,
        storeName: item.storeName,
        receiptDate: item.receiptDate,
        catalogPrice: catalog?.expectedPrice,
        category: catalog?.category,
        emoji: catalog?.emoji ?? getItemEmoji(undefined, item.name),
      });
      continue;
    }

    const isNewer = !existing.receiptDate || item.receiptDate.localeCompare(existing.receiptDate) > 0;
    if (isNewer) {
      existing.lastPrice = item.price;
      existing.storeName = item.storeName;
      existing.receiptDate = item.receiptDate;
    }
    existing.source = existing.source === 'catalog' ? 'both' : 'history';
    if (!existing.displayName && catalog) {
      existing.displayName = catalog.canonicalName;
    }
  }

  return Array.from(byCanonical.values()).sort((a, b) => {
    const aDate = a.receiptDate ?? '';
    const bDate = b.receiptDate ?? '';
    if (aDate !== bDate) return bDate.localeCompare(aDate);
    return a.displayName.localeCompare(b.displayName);
  });
}

export function searchItemPickerOptions(options: ItemPickerOption[], query: string): ItemPickerOption[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const results = new Map<string, ItemPickerOption>();

  for (const option of options) {
    if (matchesQuery(option, trimmed)) {
      results.set(option.canonicalName.toLowerCase(), option);
    }
  }

  for (const item of searchGroceryCatalog(query, 20)) {
    const key = item.canonicalName.toLowerCase();
    if (results.has(key)) continue;
    const catalog = getCatalogItem(item.canonicalName);
    if (catalog) {
      results.set(key, toOptionFromCatalog(catalog, 'catalog'));
    }
  }

  return Array.from(results.values()).slice(0, 12);
}

export function getChipSuggestions(options: ItemPickerOption[]): ItemPickerOption[] {
  const popular = POPULAR_ALERT_ITEMS.map((name) =>
    options.find((option) => option.canonicalName.toLowerCase() === name.toLowerCase())
  ).filter((option): option is ItemPickerOption => option != null);

  if (popular.length >= 8) return popular.slice(0, 12);

  const fillers = options
    .filter((option) => option.source !== 'history' || option.lastPrice != null)
    .slice(0, 12 - popular.length);

  const seen = new Set(popular.map((item) => item.canonicalName.toLowerCase()));
  for (const item of fillers) {
    const key = item.canonicalName.toLowerCase();
    if (!seen.has(key)) {
      popular.push(item);
      seen.add(key);
    }
  }

  return popular.slice(0, 12);
}

export function getPopularPickerOptions(options: ItemPickerOption[]): ItemPickerOption[] {
  return getChipSuggestions(options);
}

export function optionToSelection(option: ItemPickerOption): ItemPickerSelection {
  const basePrice = option.lastPrice ?? option.catalogPrice;
  const lastSeen =
    option.lastPrice != null && option.storeName && option.receiptDate
      ? {
          price: option.lastPrice,
          storeName: option.storeName,
          receiptDate: option.receiptDate,
        }
      : undefined;

  return {
    itemName: option.displayName,
    canonicalName: option.canonicalName,
    emoji: option.emoji,
    lastSeen,
    suggestedTargetPrice: basePrice != null ? suggestTargetPrice(basePrice) : undefined,
  };
}

export function getQuickPriceButtons(suggested?: number): number[] {
  if (suggested == null || !Number.isFinite(suggested)) {
    return [3, 4, 5];
  }

  const rounded = Math.round(suggested * 100) / 100;
  const lower = Math.max(0.5, Math.round((rounded - 1) * 100) / 100);
  const higher = Math.round((rounded + 1) * 100) / 100;
  const unique = [...new Set([lower, rounded, higher])].sort((a, b) => a - b);
  return unique;
}
