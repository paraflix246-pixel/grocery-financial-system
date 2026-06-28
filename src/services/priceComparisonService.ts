import Fuse from 'fuse.js';

import {
  COMMON_STORES,
  findEstimatePrices,
  getGenericStoreEstimates,
} from '@/src/data/storePriceEstimates';
import type { ListItem } from '@/src/models/types';
import { FUZZY_MATCH_THRESHOLD } from '@/src/services/matchingService';
import { getAllStores } from '@/src/services/storeService';
import {
  applyExternalQuoteToStorePrice,
  buildAlignedStoreRows,
  getItemPriceSpreadSavings,
  type ItemStorePriceRow,
} from '@/src/services/priceComparisonLogic';
import { getCommunityPricesForItem } from '@/src/services/crowdsourcedPricingService';
import { fetchExternalPriceQuotes } from '@/src/services/externalPriceService';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';
import { getReceiptItemsWithStore, type ReceiptItemWithStore } from '@/src/services/storageService';
import { getEffectiveComparisonRegion, getEffectivePostalPrefix } from '@/src/utils/regionPreference';
import { resolveApiStoreName } from '@/src/utils/apiStoreAlias';
import { createTimedCache } from '@/src/utils/timedCache';

export type StorePrice = {
  store: string;
  price: number;
  source: 'history' | 'estimate' | 'community' | 'api';
  sampleCount?: number;
  productLabel?: string;
};

export type CheapestOption = {
  store: string;
  price: number;
  source: 'history' | 'estimate' | 'community' | 'api';
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

export type StoreCartLineItem = {
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  source: StorePrice['source'];
  productLabel?: string;
};

export type StoreCartTotal = {
  store: string;
  total: number;
  isCheapest: boolean;
  /** Line items that make up this store's cart total */
  items: StoreCartLineItem[];
  /** Primary data source used for this store's cart total */
  primarySource?: 'history' | 'community' | 'estimate' | 'api';
  /** API-matched product labels used in this store's cart total */
  apiProductLabels?: string[];
};

export function formatCartPriceSourceLabel(source: StorePrice['source']): string {
  switch (source) {
    case 'history':
      return 'Receipt';
    case 'api':
      return 'Live';
    case 'community':
      return 'Community';
    case 'estimate':
      return 'Est.';
  }
}

export type CartItemBreakdown = {
  itemName: string;
  quantity: number;
  cheapestStore: string;
  cheapestPrice: number;
  source: StorePrice['source'];
  productLabel?: string;
};

export type CartComparisonSources = {
  hasHistory: boolean;
  hasCommunity: boolean;
  hasApi: boolean;
};

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

async function getHistoryBuckets(
  itemName: string,
  regionCode?: string | null,
  postalPrefix?: string | null
): Promise<Map<string, StoreHistoryBucket>> {
  let allItems = await getReceiptItemsWithStore();
  if (allItems.length === 0) return new Map();

  const normalizedRegion = regionCode?.trim().toUpperCase();
  if (normalizedRegion) {
    const regional = filterItemsByRegion(allItems, normalizedRegion);
    if (regional.length >= 2) {
      allItems = regional;
    }
  }

  const normalizedPrefix = postalPrefix?.trim().toUpperCase();
  if (normalizedPrefix && normalizedPrefix.length >= 3) {
    const local = allItems.filter((item) =>
      (item.storePostalCode ?? '').replace(/\s+/g, '').toUpperCase().startsWith(normalizedPrefix)
    );
    if (local.length >= 2) {
      allItems = local;
    }
  }

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

function filterItemsByRegion(
  items: ReceiptItemWithStore[],
  regionCode: string
): ReceiptItemWithStore[] {
  return items.filter((item) => (item.storeRegion ?? '').toUpperCase() === regionCode);
}

async function mergeEstimatePrices(
  historyStores: Set<string>,
  itemName: string
): Promise<Array<{ store: string; price: number }>> {
  const allStores = await getAllStores({ includeHidden: true });
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

function externalQuoteSource(quote: { source: PriceQuote['source'] }): StorePrice['source'] {
  return quote.source === 'community' ? 'community' : 'api';
}

export async function getStorePricesForItem(
  itemName: string,
  regionCode?: string | null
): Promise<StorePrice[]> {
  const trimmed = itemName.trim();
  if (!trimmed) return [];

  const effectiveRegion = regionCode ?? (await getEffectiveComparisonRegion());
  const cacheKey = `${trimmed.toLowerCase()}|${effectiveRegion ?? ''}`;
  const cached = storePricesCache.get(cacheKey);
  if (cached) return cached;

  const effectivePostal = await getEffectivePostalPrefix();
  const historyBuckets = await getHistoryBuckets(trimmed, effectiveRegion, effectivePostal);
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
  for (const community of await getCommunityPricesForItem(trimmed, effectiveRegion)) {
    if (historyStores.has(community.store)) continue;
    results.push({
      store: community.store,
      price: community.avgPrice,
      source: 'community',
      sampleCount: community.sampleCount,
    });
  }

  const coveredStores = new Set(results.map((entry) => entry.store));
  for (const estimate of await mergeEstimatePrices(coveredStores, trimmed)) {
    results.push({
      store: estimate.store,
      price: estimate.price,
      source: 'estimate',
    });
  }

  const apiQuotes = await fetchExternalPriceQuotes(trimmed, effectiveRegion);
  const catalogStores = (await getAllStores({ includeHidden: true })).map((store) => store.name);
  for (const quote of apiQuotes) {
    const resolvedStore = resolveApiStoreName(quote.storeName, catalogStores);
    const quoteSource = externalQuoteSource(quote);
    const existing = results.find(
      (entry) => entry.store.toLowerCase() === resolvedStore.toLowerCase()
    );
    if (existing) {
      applyExternalQuoteToStorePrice(existing, {
        price: quote.price,
        source: quoteSource,
        productLabel: quote.productLabel,
      });
      continue;
    }
    results.push({
      store: resolvedStore,
      price: quote.price,
      source: quoteSource,
      productLabel: quote.productLabel,
    });
  }

  const sorted = results.sort((a, b) => a.price - b.price);
  storePricesCache.set(cacheKey, sorted);
  return sorted;
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
    if (cheapest.source !== 'estimate') hasEstimateOnly = false;

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
  const postalPrefix = await getEffectivePostalPrefix();
  const areaHint = postalPrefix ? ` near ${postalPrefix}` : '';

  if (opportunity.totalSavings <= 0) {
    return {
      headline: 'You are already on the cheapest options',
      subtext: postalPrefix
        ? `Prices compared in your ${postalPrefix} area from receipt history.`
        : 'Keep scanning receipts to refine store prices.',
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
      ? `Cheapest options for ${itemText}${areaHint} — scan more receipts for better accuracy.`
      : `Shop at ${storeLabel} for the best deals on ${itemText}${areaHint}.`,
  };
}

export async function getStoreCartTotals(
  listItems: ListItem[],
  options?: { forceRefresh?: boolean }
): Promise<StoreCartTotal[]> {
  if (listItems.length === 0) return [];

  const cacheKey = buildListItemsSignature(listItems);
  if (!options?.forceRefresh) {
    const cached = cartTotalsCache.get(cacheKey);
    if (cached) return cached;
  }

  const allStores = await getAllStores({ includeHidden: true });

  const storeNames = allStores.map((s) => s.name);

  const storeTotals = new Map<string, number>();
  const storeItems = new Map<string, StoreCartLineItem[]>();
  const storeSources = new Map<string, Set<StorePrice['source']>>();
  const storeApiLabels = new Map<string, string[]>();
  for (const store of storeNames) {
    storeTotals.set(store, 0);
    storeItems.set(store, []);
    storeSources.set(store, new Set());
    storeApiLabels.set(store, []);
  }

  for (const item of listItems) {
    const prices = await getStorePricesForItem(item.name);
    for (const store of storeNames) {
      const entry = prices.find((p) => p.store.toLowerCase() === store.toLowerCase());
      if (entry) {
        const lineTotal = entry.price * item.quantity;
        storeTotals.set(store, (storeTotals.get(store) ?? 0) + lineTotal);
        storeItems.get(store)?.push({
          itemName: item.name,
          quantity: item.quantity,
          unitPrice: entry.price,
          lineTotal,
          source: entry.source,
          productLabel: entry.productLabel,
        });
        storeSources.get(store)?.add(entry.source);
        if (entry.source === 'api' && entry.productLabel) {
          const labels = storeApiLabels.get(store) ?? [];
          labels.push(entry.productLabel);
          storeApiLabels.set(store, labels);
        }
      }
    }
  }

  const ranked = [...storeTotals.entries()]
    .filter(([, total]) => total > 0)
    .sort((a, b) => a[1] - b[1]);

  if (ranked.length === 0) return [];

  const cheapestTotal = ranked[0][1];
  const result = ranked.map(([store, total]) => {
    const sources = storeSources.get(store) ?? new Set();
    const primarySource: StoreCartTotal['primarySource'] = sources.has('history')
      ? 'history'
      : sources.has('api')
        ? 'api'
        : sources.has('community')
          ? 'community'
          : 'estimate';
    return {
      store,
      total,
      isCheapest: total === cheapestTotal,
      items: storeItems.get(store) ?? [],
      primarySource,
      apiProductLabels:
        (storeApiLabels.get(store)?.length ?? 0) > 0
          ? [...new Set(storeApiLabels.get(store))]
          : undefined,
    };
  });
  cartTotalsCache.set(cacheKey, result);
  return result;
}

export async function getCartItemBreakdown(listItems: ListItem[]): Promise<CartItemBreakdown[]> {
  const breakdown: CartItemBreakdown[] = [];

  for (const item of listItems) {
    const prices = await getStorePricesForItem(item.name);
    if (prices.length === 0) continue;

    const cheapest = prices[0];
    breakdown.push({
      itemName: item.name,
      quantity: item.quantity,
      cheapestStore: cheapest.store,
      cheapestPrice: cheapest.price,
      source: cheapest.source,
      productLabel: cheapest.source === 'api' ? cheapest.productLabel : undefined,
    });
  }

  return breakdown;
}

export async function getCartComparisonSources(listItems: ListItem[]): Promise<CartComparisonSources> {
  let hasHistory = false;
  let hasCommunity = false;
  let hasApi = false;
  for (const item of listItems) {
    const prices = await getStorePricesForItem(item.name);
    if (prices.some((p) => p.source === 'history')) hasHistory = true;
    if (prices.some((p) => p.source === 'community')) hasCommunity = true;
    if (prices.some((p) => p.source === 'api')) hasApi = true;
    if (hasHistory && hasCommunity && hasApi) break;
  }
  return { hasHistory, hasCommunity, hasApi };
}

export function getMaxCartSavings(storeTotals: StoreCartTotal[]): number {
  if (storeTotals.length < 2) return 0;
  const cheapest = storeTotals[0].total;
  const priciest = storeTotals[storeTotals.length - 1].total;
  return Math.max(priciest - cheapest, 0);
}

/** Auto-rotate interval for single-item cart comparison (~90s). */
export const CART_ITEM_ROTATION_MS = 90_000;

const COMPARISON_CACHE_TTL_MS = 60_000;
const rotatingComparisonCache = createTimedCache<RotatingItemComparison[]>(COMPARISON_CACHE_TTL_MS);
const cartTotalsCache = createTimedCache<StoreCartTotal[]>(COMPARISON_CACHE_TTL_MS);
const storePricesCache = createTimedCache<StorePrice[]>(COMPARISON_CACHE_TTL_MS);

export function buildListItemsSignature(listItems: ListItem[]): string {
  return listItems
    .map((item) => `${item.id}:${item.name}:${item.quantity}:${item.storePreference ?? ''}`)
    .join('|');
}

export function invalidatePriceComparisonCache(): void {
  rotatingComparisonCache.clear();
  cartTotalsCache.clear();
  storePricesCache.clear();
}

export type { ItemStorePriceRow } from '@/src/services/priceComparisonLogic';
export { buildAlignedStoreRows, getItemPriceSpreadSavings } from '@/src/services/priceComparisonLogic';

export type RotatingItemComparison = {
  itemId: string;
  listId: string;
  itemName: string;
  quantity: number;
  storePreference?: string;
  storeRows: ItemStorePriceRow[];
  itemSavings: number;
  cheapestPrice: number;
  priciestPrice: number;
  hasHistory: boolean;
  hasCommunity: boolean;
  hasApi: boolean;
};

export async function getRotatingItemComparisons(
  listItems: ListItem[],
  options?: { forceRefresh?: boolean }
): Promise<RotatingItemComparison[]> {
  if (listItems.length === 0) return [];

  const cacheKey = buildListItemsSignature(listItems);
  if (!options?.forceRefresh) {
    const cached = rotatingComparisonCache.get(cacheKey);
    if (cached) return cached;
  } else {
    storePricesCache.clear();
    cartTotalsCache.clear();
    const effectiveRegion = await getEffectiveComparisonRegion();
    const uniqueNames = [
      ...new Set(listItems.map((item) => item.name.trim()).filter(Boolean)),
    ];
    await Promise.all(
      uniqueNames.map((name) =>
        fetchExternalPriceQuotes(name, effectiveRegion, { forceRefresh: true })
      )
    );
  }

  const allStores = await getAllStores({ includeHidden: true });
  const storeNames = allStores.map((store) => store.name);

  const comparisonResults = await Promise.all(
    listItems.map(async (item) => {
      const prices = await getStorePricesForItem(item.name);
      const storeRows = buildAlignedStoreRows(storeNames, prices);
      if (storeRows.length === 0) return null;

      return {
        itemId: item.id,
        listId: item.listId,
        itemName: item.name,
        quantity: item.quantity,
        storePreference: item.storePreference,
        storeRows,
        itemSavings: getItemPriceSpreadSavings(storeRows, item.quantity),
        cheapestPrice: storeRows[0].price,
        priciestPrice: storeRows[storeRows.length - 1].price,
        hasHistory: prices.some((entry) => entry.source === 'history'),
        hasCommunity: prices.some((entry) => entry.source === 'community'),
        hasApi: prices.some((entry) => entry.source === 'api'),
      } satisfies RotatingItemComparison;
    })
  );

  const comparisons = (comparisonResults as Array<RotatingItemComparison | null>).filter(
    (entry): entry is RotatingItemComparison => entry != null
  );

  rotatingComparisonCache.set(cacheKey, comparisons);
  return comparisons;
}
