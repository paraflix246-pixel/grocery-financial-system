import Fuse from 'fuse.js';

import {
  COMMON_STORES,
  findEstimatePrices,
  getGenericStoreEstimates,
} from '@/src/data/storePriceEstimates';
import type { ListItem } from '@/src/models/types';
import { FUZZY_MATCH_THRESHOLD } from '@/src/services/matchingService';
import { getAllStores } from '@/src/services/storeService';
import { getReceiptItemsWithStore } from '@/src/services/storageService';

export type StorePrice = {
  store: string;
  price: number;
  source: 'history' | 'estimate';
  sampleCount?: number;
};

export type CheapestOption = {
  store: string;
  price: number;
  source: 'history' | 'estimate';
};

export type ListSavingsBreakdownItem = {
  itemName: string;
  quantity: number;
  plannedPrice: number;
  cheapestPrice: number;
  cheapestStore: string;
  savings: number;
};

export type ListSavingsOpportunity = {
  totalSavings: number;
  itemsWithSavings: number;
  recommendedStore: string | null;
  hasEstimateOnly: boolean;
  breakdown: ListSavingsBreakdownItem[];
};

export type StoreCartTotal = {
  store: string;
  total: number;
  isCheapest: boolean;
};

const DEMO_CART_ITEMS = ['milk', 'bananas', 'cereal', 'bread'];

type StoreHistoryBucket = {
  prices: number[];
  dates: string[];
};

function averageRecentPrices(prices: number[], dates: string[], maxRecent = 5): number {
  const combined = prices.map((price, index) => ({ price, date: dates[index] }));
  combined.sort((a, b) => b.date.localeCompare(a.date));
  const recent = combined.slice(0, maxRecent).map((entry) => entry.price);
  return recent.reduce((sum, price) => sum + price, 0) / recent.length;
}

async function getHistoryBuckets(itemName: string): Promise<Map<string, StoreHistoryBucket>> {
  const allItems = await getReceiptItemsWithStore();
  if (allItems.length === 0) return new Map();

  const fuse = new Fuse(
    allItems.map((item) => ({ ...item, searchName: item.name.toLowerCase() })),
    {
      keys: ['searchName', 'name'],
      threshold: 1 - FUZZY_MATCH_THRESHOLD,
      includeScore: true,
    }
  );

  const matches = fuse.search(itemName.toLowerCase());
  const buckets = new Map<string, StoreHistoryBucket>();

  for (const match of matches) {
    if (match.score == null || match.score > 1 - FUZZY_MATCH_THRESHOLD) continue;
    const item = match.item;
    const bucket = buckets.get(item.storeName) ?? { prices: [], dates: [] };
    bucket.prices.push(item.price);
    bucket.dates.push(item.receiptDate);
    buckets.set(item.storeName, bucket);
  }

  return buckets;
}

async function mergeEstimatePrices(
  historyStores: Set<string>,
  itemName: string
): Promise<Array<{ store: string; price: number }>> {
  const allStores = await getAllStores();
  const storeNames = allStores.map((store) => store.name);
  const specific = findEstimatePrices(itemName);
  const estimates =
    Object.keys(specific).length > 0
      ? { ...getGenericStoreEstimates(itemName, storeNames), ...specific }
      : getGenericStoreEstimates(itemName, storeNames);

  const extras: Array<{ store: string; price: number }> = [];
  for (const store of storeNames) {
    if (historyStores.has(store)) continue;
    const price = estimates[store];
    if (price != null) {
      extras.push({ store, price });
    }
  }
  return extras;
}

export async function getStorePricesForItem(itemName: string): Promise<StorePrice[]> {
  const trimmed = itemName.trim();
  if (!trimmed) return [];

  const historyBuckets = await getHistoryBuckets(trimmed);
  const results: StorePrice[] = [];

  for (const [store, bucket] of historyBuckets) {
    results.push({
      store,
      price: averageRecentPrices(bucket.prices, bucket.dates),
      source: 'history',
      sampleCount: bucket.prices.length,
    });
  }

  const historyStores = new Set(results.map((entry) => entry.store));
  for (const estimate of await mergeEstimatePrices(historyStores, trimmed)) {
    results.push({
      store: estimate.store,
      price: estimate.price,
      source: 'estimate',
    });
  }

  return results.sort((a, b) => a.price - b.price);
}

export async function getCheapestStore(itemName: string): Promise<CheapestOption | null> {
  const prices = await getStorePricesForItem(itemName);
  if (prices.length === 0) return null;
  const cheapest = prices[0];
  return { store: cheapest.store, price: cheapest.price, source: cheapest.source };
}

function resolvePlannedUnitPrice(item: ListItem, storePrices: StorePrice[]): number {
  if (item.expectedPrice > 0) return item.expectedPrice;

  if (item.storePreference) {
    const preferred = storePrices.find(
      (entry) => entry.store.toLowerCase() === item.storePreference!.toLowerCase()
    );
    if (preferred) return preferred.price;
  }

  if (storePrices.length === 0) return 0;
  return storePrices[storePrices.length - 1].price;
}

export async function getListSavingsOpportunity(
  listItems: ListItem[]
): Promise<ListSavingsOpportunity> {
  const breakdown: ListSavingsBreakdownItem[] = [];
  const storeWinCounts = new Map<string, number>();
  let hasEstimateOnly = true;

  for (const item of listItems) {
    const storePrices = await getStorePricesForItem(item.name);
    if (storePrices.length === 0) continue;

    const cheapest = storePrices[0];
    if (cheapest.source === 'history') hasEstimateOnly = false;

    const plannedUnit = resolvePlannedUnitPrice(item, storePrices);
    const savings = (plannedUnit - cheapest.price) * item.quantity;

    if (savings > 0.005) {
      breakdown.push({
        itemName: item.name,
        quantity: item.quantity,
        plannedPrice: plannedUnit,
        cheapestPrice: cheapest.price,
        cheapestStore: cheapest.store,
        savings,
      });
      storeWinCounts.set(
        cheapest.store,
        (storeWinCounts.get(cheapest.store) ?? 0) + 1
      );
    }
  }

  const recommendedStore =
    [...storeWinCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalSavings: breakdown.reduce((sum, entry) => sum + entry.savings, 0),
    itemsWithSavings: breakdown.length,
    recommendedStore,
    hasEstimateOnly,
    breakdown,
  };
}

export async function getActiveListCheapestInsight(
  listItems: ListItem[]
): Promise<{ headline: string; subtext: string } | null> {
  if (listItems.length === 0) return null;

  const opportunity = await getListSavingsOpportunity(listItems);
  if (opportunity.totalSavings <= 0) {
    return {
      headline: 'You are already on the cheapest options',
      subtext: 'Keep scanning receipts to refine store prices.',
    };
  }

  const storeLabel = opportunity.recommendedStore ?? 'multiple stores';
  const savingsText = `$${opportunity.totalSavings.toFixed(2)}`;
  const itemText =
    opportunity.itemsWithSavings === 1
      ? '1 item'
      : `${opportunity.itemsWithSavings} items`;

  return {
    headline: `Save ~${savingsText} on your list`,
    subtext: opportunity.hasEstimateOnly
      ? `Cheapest options for ${itemText} — scan more receipts for better accuracy.`
      : `Shop at ${storeLabel} for the best deals on ${itemText}.`,
  };
}

export async function getStoreCartTotals(listItems: ListItem[]): Promise<StoreCartTotal[]> {
  const allStores = await getAllStores();
  const itemsToPrice =
    listItems.length > 0
      ? listItems
      : DEMO_CART_ITEMS.map((name, index) => ({
          id: `demo-${index}`,
          listId: 'demo',
          name,
          expectedPrice: 0,
          quantity: 1,
          category: '',
          sortOrder: index,
        }));

  const storeNames = allStores.map((s) => s.name);

  const storeTotals = new Map<string, number>();
  for (const store of storeNames) {
    storeTotals.set(store, 0);
  }

  for (const item of itemsToPrice) {
    const prices = await getStorePricesForItem(item.name);
    for (const store of storeNames) {
      const entry = prices.find((p) => p.store.toLowerCase() === store.toLowerCase());
      if (entry) {
        storeTotals.set(store, (storeTotals.get(store) ?? 0) + entry.price * item.quantity);
      }
    }
  }

  const ranked = [...storeTotals.entries()]
    .filter(([, total]) => total > 0)
    .sort((a, b) => a[1] - b[1]);

  if (ranked.length === 0) return [];

  const cheapestTotal = ranked[0][1];
  return ranked.map(([store, total]) => ({
    store,
    total,
    isCheapest: total === cheapestTotal,
  }));
}

export function getMaxCartSavings(storeTotals: StoreCartTotal[]): number {
  if (storeTotals.length < 2) return 0;
  const cheapest = storeTotals[0].total;
  const priciest = storeTotals[storeTotals.length - 1].total;
  return Math.max(priciest - cheapest, 0);
}
