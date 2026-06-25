import { getCommunityPricesForItem } from '@/src/services/crowdsourcedPricingService';
import { resolveCanonicalName } from '@/src/services/itemNormalizationService';
import {
  getStorePricesForItem,
  type StorePrice,
} from '@/src/services/priceComparisonService';
import {
  aggregateFrequentItems,
  buildCheapestStoreRecommendation,
  buildCommunityRecommendations,
  buildPersonalRecommendations,
  getLastPaidForItem,
  mergePriceQuotes,
  type CheapestStoreRecommendation,
  type FrequentPurchasedItem,
  type PriceQuote,
  type PriceRecommendation,
  type ReceiptItemRow,
  type ReceiptItemRowWithKind,
} from '@/src/services/priceRecommendationLogic';
import { canAccessFeature } from '@/src/services/featureGateService';
import { filterReceiptDatesByTier } from '@/src/services/tierLimits';
import {
  getReceiptItemsWithStore,
  type ReceiptItemWithStore,
} from '@/src/services/storageService';
import { getEffectiveComparisonRegion } from '@/src/utils/regionPreference';
import { classifyReceiptLineKind } from '@/src/utils/receiptMerchandiseFilter';
import {
  fetchExternalPriceQuotes,
  getRegisteredExternalProviderCount,
} from '@/src/services/externalPriceService';

export type { ExternalPriceSource } from '@/src/services/externalPriceService';
export {
  clearExternalPriceProviders,
  fetchExternalPriceQuotes,
  getRegisteredExternalProviderCount,
  registerExternalPriceProvider,
} from '@/src/services/externalPriceService';

function toReceiptRows(items: ReceiptItemWithStore[]): ReceiptItemRowWithKind[] {
  return items.map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    storeName: item.storeName,
    receiptDate: item.receiptDate,
    lineKind: item.lineKind ?? classifyReceiptLineKind(item.name),
  }));
}

function storePriceToQuote(itemName: string, entry: StorePrice): PriceQuote {
  const source =
    entry.source === 'history'
      ? 'receipt'
      : entry.source === 'community'
        ? 'community'
        : entry.source === 'api'
          ? 'api'
          : 'estimate';

  return {
    itemName,
    storeName: entry.store,
    price: entry.price,
    date: '',
    source,
  };
}

async function fetchExternalQuotes(
  itemName: string,
  regionCode?: string | null
): Promise<PriceQuote[]> {
  return fetchExternalPriceQuotes(itemName, regionCode);
}

async function fetchCommunityQuotes(
  itemName: string,
  regionCode?: string | null
): Promise<PriceQuote[]> {
  const community = await getCommunityPricesForItem(itemName, regionCode);
  return community.map((entry) => ({
    itemName,
    storeName: entry.store,
    price: entry.avgPrice,
    date: entry.latestDate,
    source: 'community' as const,
  }));
}

export async function getFrequentPurchasedItems(limit = 10): Promise<FrequentPurchasedItem[]> {
  const items = await getReceiptItemsWithStore();
  return aggregateFrequentItems(toReceiptRows(items), resolveCanonicalName, limit);
}

export async function getCheapestStoreForItem(itemName: string): Promise<PriceQuote[]> {
  const trimmed = itemName.trim();
  if (!trimmed) return [];

  const region = await getEffectiveComparisonRegion();
  const [storePrices, communityQuotes, externalQuotes] = await Promise.all([
    getStorePricesForItem(trimmed, region),
    fetchCommunityQuotes(trimmed, region),
    fetchExternalQuotes(trimmed, region),
  ]);

  const baseQuotes = storePrices.map((entry) => storePriceToQuote(trimmed, entry));
  return mergePriceQuotes(mergePriceQuotes(baseQuotes, communityQuotes), externalQuotes);
}

export async function getCheapestStoreRecommendations(
  itemNames: string[],
  limit = 8
): Promise<CheapestStoreRecommendation[]> {
  if (!canAccessFeature('cheapest_basket')) {
    return [];
  }
  const uniqueNames = [...new Set(itemNames.map((name) => name.trim()).filter(Boolean))].slice(
    0,
    limit
  );
  if (uniqueNames.length === 0) return [];

  const receiptItems = toReceiptRows(await getReceiptItemsWithStore());
  const results: CheapestStoreRecommendation[] = [];

  for (const itemName of uniqueNames) {
    const quotes = await getCheapestStoreForItem(itemName);
    const lastPaid = getLastPaidForItem(receiptItems, itemName, resolveCanonicalName);
    const recommendation = buildCheapestStoreRecommendation(itemName, quotes, lastPaid);
    if (recommendation) {
      results.push(recommendation);
    }
  }

  return results.sort(
    (a, b) => (b.savingsVsLastPaid ?? 0) - (a.savingsVsLastPaid ?? 0)
  );
}

export type PriceRecommendationsBundle = {
  personal: PriceRecommendation[];
  community: PriceRecommendation[];
  hasExternalProviders: boolean;
};

export async function getPriceRecommendations(limit = 5): Promise<PriceRecommendationsBundle> {
  if (!canAccessFeature('price_drop_alerts')) {
    return { personal: [], community: [], hasExternalProviders: false };
  }
  const receiptItems = toReceiptRows(filterReceiptDatesByTier(await getReceiptItemsWithStore()));
  const frequent = aggregateFrequentItems(receiptItems, resolveCanonicalName, 10);
  const itemNames = frequent.map((item) => item.canonicalName);

  const personal = buildPersonalRecommendations(
    frequent,
    receiptItems,
    resolveCanonicalName,
    2,
    limit
  );

  const quotesByItem = new Map<string, PriceQuote[]>();
  const lastPaidByItem = new Map<string, ReturnType<typeof getLastPaidForItem>>();

  for (const itemName of itemNames) {
    const key = itemName.toLowerCase();
    quotesByItem.set(key, await getCheapestStoreForItem(itemName));
    lastPaidByItem.set(key, getLastPaidForItem(receiptItems, itemName, resolveCanonicalName));
  }

  const community = buildCommunityRecommendations(
    itemNames,
    quotesByItem,
    lastPaidByItem,
    limit
  );

  return {
    personal,
    community,
    hasExternalProviders: getRegisteredExternalProviderCount() > 0,
  };
}

export async function getCheapestStoreRecommendationsForFrequent(
  limit = 8
): Promise<CheapestStoreRecommendation[]> {
  const frequent = await getFrequentPurchasedItems(limit);
  return getCheapestStoreRecommendations(
    frequent.map((item) => item.canonicalName),
    limit
  );
}

export type {
  CheapestStoreRecommendation,
  FrequentPurchasedItem,
  PriceQuote,
  PriceRecommendation,
} from '@/src/services/priceRecommendationLogic';
