import type { ListItem, Receipt } from '@/src/models/types';
import type { PantryItemView } from '@/src/services/pantryService';

export type MoneyLeakBlindSpotKind = 'overlap' | 'expiring' | 'low_stock' | 'repeat_rebuy';

export type MoneyLeakBlindSpot = {
  id: string;
  kind: MoneyLeakBlindSpotKind;
  labelKey: string;
  labelParams?: Record<string, string | number>;
  estimatedCost?: number;
};

export type MoneyLeakReport = {
  hasData: boolean;
  blindSpotCount: number;
  estimatedAtRisk: number | null;
  blindSpots: MoneyLeakBlindSpot[];
};

function itemKey(name: string, canonicalName?: string): string {
  return (canonicalName ?? name).trim().toLowerCase();
}

function pantryKeys(item: PantryItemView): string[] {
  const keys = new Set<string>();
  const nameKey = itemKey(item.name);
  if (nameKey) keys.add(nameKey);
  if (item.canonicalName) {
    const canonicalKey = itemKey(item.canonicalName);
    if (canonicalKey) keys.add(canonicalKey);
  }
  return [...keys];
}

function itemsMatch(
  leftName: string,
  leftCanonical: string | undefined,
  rightName: string,
  rightCanonical?: string
): boolean {
  const left = itemKey(leftName, leftCanonical);
  const right = itemKey(rightName, rightCanonical);
  return left.length > 0 && left === right;
}

function pantryListOverlap(listItem: ListItem, pantryItem: PantryItemView): boolean {
  const listKey = itemKey(listItem.name);
  return pantryKeys(pantryItem).includes(listKey);
}

function getLastItemPrice(receipts: Receipt[], itemName: string): number | null {
  const sorted = [...receipts].sort((a, b) => b.date.localeCompare(a.date));
  for (const receipt of sorted) {
    for (const item of receipt.items ?? []) {
      if (itemsMatch(item.name, undefined, itemName, undefined)) {
        return item.price * (item.quantity ?? 1);
      }
    }
  }
  return null;
}

function findPantryListOverlaps(
  pantryItems: PantryItemView[],
  listItems: ListItem[]
): string[] {
  const overlaps: string[] = [];
  for (const listItem of listItems) {
    const matched = pantryItems.some((pantryItem) => pantryListOverlap(listItem, pantryItem));
    if (matched) overlaps.push(listItem.name);
  }
  return overlaps;
}

/** Heuristic money-leak report from pantry, list, and receipt data — no invented totals. */
export function buildMoneyLeakReport(input: {
  pantryItems: PantryItemView[];
  listItems: ListItem[];
  receipts: Receipt[];
  now?: Date;
}): MoneyLeakReport {
  const blindSpots: MoneyLeakBlindSpot[] = [];
  let estimatedAtRisk = 0;
  let hasPriceData = false;

  const overlaps = findPantryListOverlaps(input.pantryItems, input.listItems);
  if (overlaps.length > 0) {
    let overlapCost = 0;
    for (const name of overlaps) {
      const price = getLastItemPrice(input.receipts, name);
      if (price != null) {
        overlapCost += price;
        hasPriceData = true;
      }
    }
    blindSpots.push({
      id: 'pantry-list-overlap',
      kind: 'overlap',
      labelKey:
        overlaps.length === 1
          ? 'moneyLeak.spots.overlapOne'
          : 'moneyLeak.spots.overlapMany',
      labelParams: { count: overlaps.length, name: overlaps[0] ?? '' },
      estimatedCost: overlapCost > 0 ? overlapCost : undefined,
    });
    if (overlapCost > 0) estimatedAtRisk += overlapCost;
  }

  const expiringSoon = input.pantryItems.filter(
    (item) => item.daysUntilExpiry != null && item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= 7
  );
  if (expiringSoon.length > 0) {
    blindSpots.push({
      id: 'expiring',
      kind: 'expiring',
      labelKey:
        expiringSoon.length === 1
          ? 'moneyLeak.spots.expiringOne'
          : 'moneyLeak.spots.expiringMany',
      labelParams: { count: expiringSoon.length },
    });
  }

  const lowStockOnly = input.pantryItems.filter((item) => item.status === 'running_low');
  if (lowStockOnly.length > 0) {
    blindSpots.push({
      id: 'low-stock',
      kind: 'low_stock',
      labelKey:
        lowStockOnly.length === 1
          ? 'moneyLeak.spots.lowStockOne'
          : 'moneyLeak.spots.lowStockMany',
      labelParams: { count: lowStockOnly.length },
    });
  }

  const now = input.now ?? new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const purchaseCounts = new Map<string, { count: number; displayName: string }>();
  for (const receipt of input.receipts) {
    if (receipt.date < cutoffIso) continue;
    for (const item of receipt.items ?? []) {
      const key = itemKey(item.name);
      const existing = purchaseCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        purchaseCounts.set(key, { count: 1, displayName: item.name });
      }
    }
  }

  const repeatRebuys = [...purchaseCounts.values()]
    .filter((entry) => entry.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  for (const { count, displayName } of repeatRebuys) {
    const price = getLastItemPrice(input.receipts, displayName);
    const extraPurchases = Math.min(count - 1, 2);
    const spotCost = price != null ? price * extraPurchases : undefined;
    if (spotCost != null) {
      hasPriceData = true;
      estimatedAtRisk += spotCost;
    }
    blindSpots.push({
      id: `repeat-${itemKey(displayName)}`,
      kind: 'repeat_rebuy',
      labelKey: 'moneyLeak.spots.repeatRebuy',
      labelParams: { name: displayName, count },
      estimatedCost: spotCost,
    });
  }

  const hasData = input.receipts.length > 0 || input.pantryItems.length > 0;
  const blindSpotCount =
    overlaps.length + expiringSoon.length + lowStockOnly.length + repeatRebuys.length;

  return {
    hasData,
    blindSpotCount,
    estimatedAtRisk:
      hasPriceData && estimatedAtRisk > 0 ? Math.round(estimatedAtRisk * 100) / 100 : null,
    blindSpots,
  };
}
