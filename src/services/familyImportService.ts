import {
  createListItem,
  createList,
  deleteListItem,
  getListItems,
  updateListItem,
} from '@/src/services/storageService';
import { resolveCanonicalName } from '@/src/services/itemNormalizationService';
import type { FamilyListSnapshot } from '@/src/services/familyListSnapshot';

export type { FamilyListSnapshot } from '@/src/services/familyListSnapshot';
export { parseFamilyListSnapshot } from '@/src/services/familyListSnapshot';
function itemKey(name: string): string {
  return (resolveCanonicalName(name) ?? name).trim().toLowerCase();
}

export async function importFamilyListSnapshot(
  snapshot: FamilyListSnapshot,
  options: { mergeIntoListId?: string; createNew?: boolean } = {}
): Promise<{ listId: string; added: number; skipped: number }> {
  const mergeIntoListId = options.mergeIntoListId;
  let listId = mergeIntoListId;

  if (!listId || options.createNew) {
    const list = await createList(snapshot.listName?.trim() || 'Shared List');
    listId = list.id;
  }

  const existing = await getListItems(listId);
  const existingKeys = new Set(existing.map((i) => itemKey(i.name)));

  let added = 0;
  let skipped = 0;
  for (const item of snapshot.items) {
    const name = item.name?.trim();
    if (!name) continue;
    const key = itemKey(name);
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    await createListItem(listId, {
      name: resolveCanonicalName(name) ?? name,
      quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
      expectedPrice: item.expectedPrice ?? 0,
      category: item.category?.trim() || 'Other',
    });
    existingKeys.add(key);
    added += 1;
  }

  return { listId, added, skipped };
}

export async function mergeFamilyListIntoExisting(
  listId: string,
  snapshot: FamilyListSnapshot
): Promise<{ added: number; skipped: number }> {
  const result = await importFamilyListSnapshot(snapshot, { mergeIntoListId: listId });
  return { added: result.added, skipped: result.skipped };
}

/** Full sync from a remote shared list — updates, adds, and removes items to match snapshot. */
export async function syncFamilyListSnapshot(
  listId: string,
  snapshot: FamilyListSnapshot
): Promise<{ added: number; updated: number; removed: number }> {
  const existing = await getListItems(listId);
  const byKey = new Map(existing.map((item) => [itemKey(item.name), item]));
  const remoteKeys = new Set<string>();

  let added = 0;
  let updated = 0;

  for (const item of snapshot.items) {
    const name = item.name?.trim();
    if (!name) continue;
    const key = itemKey(name);
    remoteKeys.add(key);
    const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    const expectedPrice = item.expectedPrice ?? 0;
    const category = item.category?.trim() || 'Other';
    const current = byKey.get(key);

    if (current) {
      const changed =
        current.quantity !== quantity ||
        current.expectedPrice !== expectedPrice ||
        (current.category || 'Other') !== category ||
        current.name !== (resolveCanonicalName(name) ?? name);
      if (changed) {
        await updateListItem(current.id, {
          name: resolveCanonicalName(name) ?? name,
          quantity,
          expectedPrice,
          category,
        });
        updated += 1;
      }
    } else {
      await createListItem(listId, {
        name: resolveCanonicalName(name) ?? name,
        quantity,
        expectedPrice,
        category,
      });
      added += 1;
    }
  }

  let removed = 0;
  for (const item of existing) {
    if (!remoteKeys.has(itemKey(item.name))) {
      await deleteListItem(item.id);
      removed += 1;
    }
  }

  return { added, updated, removed };
}
