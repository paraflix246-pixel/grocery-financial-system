import type { GroceryList, Receipt } from '@/src/models/types';
import type { ReceiptItemRow } from '@/src/services/priceTrackerLogic';

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

/** Flatten scoped receipts into rows for comparison fallbacks (newest receipts first). */
export function receiptRowsFromReceipts(receipts: readonly Receipt[]): ReceiptItemRow[] {
  const sorted = [...receipts].sort((a, b) => b.date.localeCompare(a.date));
  const rows: ReceiptItemRow[] = [];
  for (const receipt of sorted) {
    for (const item of receipt.items ?? []) {
      rows.push({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        storeName: receipt.storeName,
        receiptDate: receipt.date,
      });
    }
  }
  return rows;
}
