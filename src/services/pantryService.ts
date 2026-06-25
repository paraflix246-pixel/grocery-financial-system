import { getItemEmoji } from '@/src/data/commonGroceryItems';

import { getPopularGroceryItems, GROCERY_CATEGORIES, type GroceryCategory } from '@/src/data/groceryCatalog';

import type { PantryItem, Receipt, ReceiptItem } from '@/src/models/types';

import { resolveCanonicalName } from '@/src/services/itemNormalizationService';

import {

  createList,

  createListItem,

  createPantryItem,

  deletePantryItem,

  deletePantryItems,

  getActiveList,

  getAllLists,

  getListItems,

  getPantryItems,

  getReceiptItemsWithStore,

  updatePantryItem,

  upsertPantryItemFromReceipt,

} from '@/src/services/storageService';

import {
  todayISO,
  normalizeReceiptDate,
  resolvePantryAddedDateFromReceipt,
} from '@/src/utils/dateParser';

import { isPantryEligibleItem } from '@/src/utils/itemEmojiResolver';

import { inferPantryCategory, PANTRY_CATEGORIES, PANTRY_FALLBACK_CATEGORY } from '@/src/utils/pantryCategory';

import { formatPantryQuantity } from '@/src/utils/pantryQuantity';

import {

  computePantryStatus,

  DEFAULT_LOW_STOCK_THRESHOLD,

  getDaysUntilExpiry,

  getLowStockThreshold,

  getShelfLifeDays,

  inferDefaultShelfLifeDays,

  LOW_STOCK_THRESHOLD_OPTIONS,

  SHELF_LIFE_OPTIONS,

} from '@/src/utils/pantryStatus';



export {

  computePantryStatus,

  DEFAULT_LOW_STOCK_THRESHOLD,

  formatPantryQuantity,

  getLowStockThreshold,

  getShelfLifeDays,

  inferDefaultShelfLifeDays,

  inferPantryCategory,

  LOW_STOCK_THRESHOLD_OPTIONS,

  PANTRY_CATEGORIES,

  PANTRY_FALLBACK_CATEGORY,

  SHELF_LIFE_OPTIONS,

};



export type PantryItemView = PantryItem & {

  emoji: string;

  status: 'in_stock' | 'running_low' | 'expiring_soon';

  statusLabel: string;

  quantityLabel: string;

  lowStockThreshold: number;

  effectiveShelfLifeDays: number | null;

  daysUntilExpiry: number | null;

};



export function toPantryItemView(item: PantryItem): PantryItemView {

  const emoji = item.emoji ?? getItemEmoji(item.canonicalName, item.name);

  return {

    ...item,

    emoji,

    lowStockThreshold: getLowStockThreshold(item),

    effectiveShelfLifeDays: getShelfLifeDays(item),

    daysUntilExpiry: getDaysUntilExpiry(item),

    ...computePantryStatus(item),

    quantityLabel: formatPantryQuantity(item),

  };

}



export async function loadPantryItems(): Promise<PantryItemView[]> {

  let items = await getPantryItems();

  if (items.length === 0) {

    await backfillPantryFromReceipts();

    items = await getPantryItems();

  }

  return items.map(toPantryItemView).sort((a, b) => a.name.localeCompare(b.name));

}



function resolveShelfLifeForSave(

  name: string,

  category: string,

  shelfLifeDays?: number

): number | undefined {

  if (shelfLifeDays !== undefined) return shelfLifeDays;
  return inferDefaultShelfLifeDays({ name, category }) ?? undefined;

}



export async function addManualPantryItem(input: {

  name: string;

  quantity: number;

  unit?: string;

  category?: string;

  lowStockThreshold?: number;

  shelfLifeDays?: number;

  addedDate?: string;

}): Promise<PantryItemView> {

  const trimmedName = input.name.trim();

  if (!trimmedName) {

    throw new Error('Item name is required');

  }

  const canonicalName = resolveCanonicalName(trimmedName) ?? trimmedName;

  const category = input.category ?? inferPantryCategory(trimmedName, canonicalName);

  const item = await createPantryItem({

    name: canonicalName,

    canonicalName,

    emoji: getItemEmoji(canonicalName, trimmedName),

    quantity: input.quantity > 0 ? input.quantity : 1,

    unit: input.unit?.trim() || undefined,

    category,

    categoryUserSet: true,

    lowStockThreshold: input.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD,

    shelfLifeDays: resolveShelfLifeForSave(canonicalName, category, input.shelfLifeDays),

    addedDate: input.addedDate ? normalizeReceiptDate(input.addedDate) : todayISO(),

    source: 'manual',

  });

  return toPantryItemView(item);

}



export async function savePantryItemAmount(

  id: string,

  input: {

    name?: string;

    quantity: number;

    unit?: string;

    category?: string;

    lowStockThreshold?: number;

    shelfLifeDays?: number;

    addedDate?: string;

  }

): Promise<PantryItemView> {

  const trimmedName = input.name?.trim();

  const updates: Parameters<typeof updatePantryItem>[1] = {

    quantity: input.quantity > 0 ? input.quantity : 1,

    unit: input.unit?.trim() || undefined,

    source: 'manual',

  };

  if (input.addedDate) {

    updates.addedDate = normalizeReceiptDate(input.addedDate);

  }

  if (input.lowStockThreshold != null) {
    updates.lowStockThreshold = input.lowStockThreshold;
  }
  if (input.shelfLifeDays !== undefined) {
    updates.shelfLifeDays = input.shelfLifeDays;
  }
  if (trimmedName) {

    updates.name = resolveCanonicalName(trimmedName) ?? trimmedName;

    updates.canonicalName = updates.name;

    updates.emoji = getItemEmoji(updates.name, trimmedName);

    if (!input.category) {

      updates.category = inferPantryCategory(trimmedName, updates.name);

    }

  }

  if (input.category) {
    updates.category = input.category;
    updates.categoryUserSet = true;
  }
  const item = await updatePantryItem(id, updates);

  return toPantryItemView(item);

}



export async function removePantryItem(id: string): Promise<void> {

  await deletePantryItem(id);

}



export async function removePantryItems(ids: string[]): Promise<void> {

  await deletePantryItems(ids);

}



export type AddPantryToListResult = {

  added: number;

  skipped: number;

  listName: string;

};



export async function addPantryItemsToShoppingList(items: PantryItemView[]): Promise<AddPantryToListResult> {

  if (items.length === 0) {

    return { added: 0, skipped: 0, listName: '' };

  }



  let list = await getActiveList();

  if (!list) {

    const lists = await getAllLists();

    list = lists[0] ?? (await createList('Shopping List'));

  }



  const existing = await getListItems(list.id);

  const existingNames = new Set(existing.map((entry) => entry.name.trim().toLowerCase()));

  let added = 0;

  let skipped = 0;



  for (const item of items) {

    const name = item.canonicalName ?? item.name;

    const key = name.trim().toLowerCase();

    if (existingNames.has(key)) {

      skipped += 1;

      continue;

    }

    await createListItem(list.id, {

      name,

      expectedPrice: 0,

      quantity: 1,

      category: item.category,

    });

    existingNames.add(key);

    added += 1;

  }



  return { added, skipped, listName: list.name };

}



export async function addExpiringItemsToShoppingList(

  allItems: PantryItemView[]

): Promise<AddPantryToListResult> {

  return addPantryItemsToShoppingList(allItems.filter((item) => item.status === 'expiring_soon'));

}



export function groupPantryItemsByCategory(
  items: PantryItemView[]
): Array<{ category: GroceryCategory; items: PantryItemView[] }> {
  const byCategory = new Map<GroceryCategory, PantryItemView[]>();
  for (const item of items) {
    const category = GROCERY_CATEGORIES.includes(item.category as GroceryCategory)
      ? (item.category as GroceryCategory)
      : PANTRY_FALLBACK_CATEGORY;
    const bucket = byCategory.get(category) ?? [];
    bucket.push(item);
    byCategory.set(category, bucket);
  }
  return GROCERY_CATEGORIES.filter((category) => byCategory.has(category)).map((category) => ({
    category,
    items: byCategory.get(category)!,
  }));
}

export async function syncPantryFromReceipt(
  receipt: Receipt & { items?: ReceiptItem[] },
  options?: { quantityMode?: 'increment' | 'set' }
): Promise<void> {
  if (!receipt.items?.length) return;
  const quantityMode = options?.quantityMode ?? 'increment';

  for (const item of receipt.items) {
    if (!isPantryEligibleItem(item.name)) continue;

    const canonicalName = resolveCanonicalName(item.name) ?? item.name.trim();
    const category = inferPantryCategory(item.name, canonicalName);

    try {
      await upsertPantryItemFromReceipt(
        {
          name: canonicalName,
          canonicalName,
          emoji: getItemEmoji(canonicalName, item.name),
          quantity: item.quantity > 0 ? item.quantity : 1,
          unit: item.unit,
          category,
          shelfLifeDays: inferDefaultShelfLifeDays({ name: canonicalName, category }) ?? undefined,
          addedDate: resolvePantryAddedDateFromReceipt(receipt),
        },
        quantityMode
      );
    } catch (error) {
      const { PantryLimitError } = await import('@/src/services/tierLimits');
      if (error instanceof PantryLimitError) {
        continue;
      }
      throw error;
    }
  }
}



export async function backfillPantryFromReceipts(): Promise<void> {

  const receiptItems = await getReceiptItemsWithStore();

  const byCanonical = new Map<string, (typeof receiptItems)[number]>();



  for (const item of receiptItems) {

    if (!isPantryEligibleItem(item.name)) continue;

    const canonical = resolveCanonicalName(item.name) ?? item.name.trim();

    const key = canonical.toLowerCase();

    const existing = byCanonical.get(key);

    if (!existing || item.receiptDate.localeCompare(existing.receiptDate) > 0) {

      byCanonical.set(key, item);

    }

  }



  for (const item of byCanonical.values()) {

    const canonicalName = resolveCanonicalName(item.name) ?? item.name.trim();

    const category = inferPantryCategory(item.name, canonicalName);

    await upsertPantryItemFromReceipt({

      name: canonicalName,

      canonicalName,

      emoji: getItemEmoji(canonicalName, item.name),

      quantity: item.quantity > 0 ? item.quantity : 1,

      unit: item.unit,

      category,

      shelfLifeDays: inferDefaultShelfLifeDays({ name: canonicalName, category }) ?? undefined,

      addedDate: normalizeReceiptDate(item.receiptDate),

    });

  }

}



export function getPantryQuickAddItems() {

  return getPopularGroceryItems();

}


