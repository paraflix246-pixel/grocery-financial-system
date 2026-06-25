import Fuse from 'fuse.js';

import type { ComparisonItem, ComparisonResult, ListItem, ReceiptItem } from '@/src/models/types';
import { sumPlannedTotal } from '@/src/utils/priceParser';
import { generateId } from '@/src/utils/id';
import {
  deleteComparisonByReceiptId,
  getListItems,
  linkReceiptToList,
  saveComparison,
} from '@/src/services/storageService';

export const FUZZY_MATCH_THRESHOLD = 0.6;
const MATCH_THRESHOLD = FUZZY_MATCH_THRESHOLD;

export function compareListToReceipt(
  listItems: ListItem[],
  receiptItems: ReceiptItem[]
): ComparisonResult {
  const fuse = new Fuse(
    receiptItems.map((r) => ({ ...r, searchName: r.name.toLowerCase() })),
    { keys: ['searchName', 'name'], threshold: 1 - MATCH_THRESHOLD, includeScore: true }
  );

  const matchedReceiptIds = new Set<string>();
  const resultItems: ComparisonResult['items'] = [];

  for (const listItem of listItems) {
    const matches = fuse.search(listItem.name.toLowerCase());
    const best = matches.find((m) => !matchedReceiptIds.has(m.item.id));

    if (best && best.score != null && best.score <= 1 - MATCH_THRESHOLD) {
      matchedReceiptIds.add(best.item.id);
      const receiptItem = best.item as ReceiptItem & { searchName: string };
      const planned = listItem.expectedPrice * listItem.quantity;
      const actual = receiptItem.price * receiptItem.quantity;
      resultItems.push({
        name: listItem.name,
        matchType: 'matched',
        plannedPrice: planned,
        actualPrice: actual,
        variance: actual - planned,
      });
    } else {
      const planned = listItem.expectedPrice * listItem.quantity;
      resultItems.push({
        name: listItem.name,
        matchType: 'missing',
        plannedPrice: planned,
        actualPrice: 0,
        variance: -planned,
      });
    }
  }

  for (const receiptItem of receiptItems) {
    if (!matchedReceiptIds.has(receiptItem.id)) {
      const actual = receiptItem.price * receiptItem.quantity;
      resultItems.push({
        name: receiptItem.name,
        matchType: 'extra',
        plannedPrice: 0,
        actualPrice: actual,
        variance: actual,
      });
    }
  }

  const plannedTotal = sumPlannedTotal(listItems);
  const actualTotal = receiptItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const variance = actualTotal - plannedTotal;

  return { plannedTotal, actualTotal, variance, items: resultItems };
}

export async function runMatchingAndSave(
  receiptId: string,
  listId: string,
  receiptItems: ReceiptItem[]
): Promise<ComparisonResult> {
  await deleteComparisonByReceiptId(receiptId);
  await linkReceiptToList(receiptId, listId);

  const listItems = await getListItems(listId);
  const result = compareListToReceipt(listItems, receiptItems);

  const comparisonItems: Omit<ComparisonItem, 'comparisonId'>[] = result.items.map((item) => {
    const listMatch = listItems.find((l) => l.name === item.name);
    const receiptMatch = receiptItems.find((r) => r.name === item.name);
    return {
      id: generateId(),
      listItemId: listMatch?.id,
      receiptItemId: receiptMatch?.id,
      matchType: item.matchType,
      name: item.name,
      plannedPrice: item.plannedPrice,
      actualPrice: item.actualPrice,
      variance: item.variance,
    };
  });

  await saveComparison(
    {
      receiptId,
      listId,
      plannedTotal: result.plannedTotal,
      actualTotal: result.actualTotal,
      variance: result.variance,
    },
    comparisonItems
  );

  return result;
}

export { getTopVarianceDriver, getOverspendDrivers } from '@/src/utils/comparisonSummaryText';
