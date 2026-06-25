import type { Receipt, ReceiptItem } from '@/src/models/types';
import { resolveCanonicalName } from '@/src/services/itemNormalizationService';
import { getReceiptItemsWithStore } from '@/src/services/storageService';
import { getReceiptDisplayTotal } from '@/src/utils/receiptTotals';
import { isBuyAgainEligibleItem } from '@/src/utils/receiptMerchandiseFilter';

export type StoreMemoryStats = {
  storeName: string;
  visitCount: number;
  visitsThisYear: number;
  averageTripTotal: number;
  totalSpent: number;
  lastVisitDate: string | null;
  favoriteItems: Array<{ name: string; purchaseCount: number; totalSpend: number }>;
};

function yearOf(isoDate: string): number {
  return parseInt(isoDate.slice(0, 4), 10);
}

export function buildStoreMemoryFromReceipts(
  storeName: string,
  receipts: Receipt[],
  receiptItems: Array<{ name: string; price: number; quantity: number; storeName: string }>
): StoreMemoryStats {
  const storeReceipts = receipts.filter(
    (r) => r.storeName.trim().toLowerCase() === storeName.trim().toLowerCase()
  );
  const currentYear = new Date().getFullYear();
  const visitCount = storeReceipts.length;
  const visitsThisYear = storeReceipts.filter((r) => yearOf(r.date) === currentYear).length;
  const totalSpent = storeReceipts.reduce((sum, r) => sum + getReceiptDisplayTotal(r), 0);
  const averageTripTotal = visitCount > 0 ? totalSpent / visitCount : 0;
  const lastVisitDate =
    storeReceipts.length > 0
      ? storeReceipts.reduce((latest, r) => (r.date > latest ? r.date : latest), storeReceipts[0].date)
      : null;

  const itemCounts = new Map<string, { name: string; purchaseCount: number; totalSpend: number }>();
  for (const item of receiptItems) {
    if (item.storeName.trim().toLowerCase() !== storeName.trim().toLowerCase()) continue;
    if (!isBuyAgainEligibleItem(item.name)) continue;
    const canonical = resolveCanonicalName(item.name) ?? item.name.trim();
    const key = canonical.toLowerCase();
    const spend = item.price * (item.quantity > 0 ? item.quantity : 1);
    const existing = itemCounts.get(key);
    if (existing) {
      existing.purchaseCount += 1;
      existing.totalSpend += spend;
    } else {
      itemCounts.set(key, { name: canonical, purchaseCount: 1, totalSpend: spend });
    }
  }

  const favoriteItems = [...itemCounts.values()]
    .sort((a, b) => b.purchaseCount - a.purchaseCount || b.totalSpend - a.totalSpend)
    .slice(0, 5);

  return {
    storeName,
    visitCount,
    visitsThisYear,
    averageTripTotal,
    totalSpent,
    lastVisitDate,
    favoriteItems,
  };
}

export async function getStoreMemoryStats(storeName: string): Promise<StoreMemoryStats> {
  const { getReceipts } = await import('@/src/services/storageService');
  const receipts = await getReceipts({ storeName });
  const allItems = await getReceiptItemsWithStore();
  const rows = allItems.map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    storeName: item.storeName,
  }));
  return buildStoreMemoryFromReceipts(storeName, receipts, rows);
}

export async function getFrequentItemsForStore(
  storeName: string,
  limit = 8
): Promise<Array<{ name: string; purchaseCount: number; lastPurchaseDate: string }>> {
  const items = await getReceiptItemsWithStore();
  const byCanonical = new Map<string, { name: string; purchaseCount: number; lastPurchaseDate: string }>();
  for (const item of items) {
    if (item.storeName.trim().toLowerCase() !== storeName.trim().toLowerCase()) continue;
    if (!isBuyAgainEligibleItem(item.name, item.lineKind)) continue;
    const canonical = resolveCanonicalName(item.name) ?? item.name.trim();
    const key = canonical.toLowerCase();
    const existing = byCanonical.get(key);
    if (!existing || item.receiptDate > existing.lastPurchaseDate) {
      byCanonical.set(key, {
        name: canonical,
        purchaseCount: (existing?.purchaseCount ?? 0) + 1,
        lastPurchaseDate: existing
          ? item.receiptDate > existing.lastPurchaseDate
            ? item.receiptDate
            : existing.lastPurchaseDate
          : item.receiptDate,
      });
    } else if (existing) {
      existing.purchaseCount += 1;
    }
  }
  return [...byCanonical.values()]
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, limit);
}
