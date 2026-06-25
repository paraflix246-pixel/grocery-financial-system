import {
  buildExternalPriceCacheKey,
  getCachedExternalPriceQuotes,
  initExternalPriceCache,
  setCachedExternalPriceQuotes,
} from '@/src/services/externalPriceCacheService';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

export interface ExternalPriceSource {
  id: string;
  getPricesForItem(itemName: string, regionCode?: string | null): Promise<PriceQuote[]>;
}

const externalProviders: ExternalPriceSource[] = [];
const inflightRefreshes = new Map<string, Promise<PriceQuote[]>>();
let invalidateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleComparisonCacheInvalidation(): void {
  if (invalidateDebounceTimer) clearTimeout(invalidateDebounceTimer);
  invalidateDebounceTimer = setTimeout(() => {
    invalidateDebounceTimer = null;
    void import('@/src/services/priceComparisonService')
      .then((mod) => mod.invalidatePriceComparisonCache())
      .catch(() => {});
  }, 1_500);
}

export function registerExternalPriceProvider(provider: ExternalPriceSource): void {
  if (externalProviders.some((entry) => entry.id === provider.id)) return;
  externalProviders.push(provider);
}

export function clearExternalPriceProviders(): void {
  externalProviders.length = 0;
}

export function getRegisteredExternalProviderCount(): number {
  return externalProviders.length;
}

async function fetchExternalPriceQuotesFromProviders(
  itemName: string,
  regionCode?: string | null
): Promise<PriceQuote[]> {
  const providerResults = await Promise.all(
    externalProviders.map((provider) => provider.getPricesForItem(itemName, regionCode))
  );
  const merged: PriceQuote[] = [];
  for (const quotes of providerResults) {
    merged.push(
      ...quotes.map((quote) => ({
        ...quote,
        source: quote.source ?? ('api' as const),
      }))
    );
  }
  return merged;
}

async function revalidateExternalPriceQuotes(
  itemName: string,
  regionCode: string | null | undefined,
  cacheKey: string
): Promise<PriceQuote[]> {
  const existing = inflightRefreshes.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const quotes = await fetchExternalPriceQuotesFromProviders(itemName, regionCode);
      await setCachedExternalPriceQuotes(cacheKey, quotes);
      scheduleComparisonCacheInvalidation();
      return quotes;
    } finally {
      inflightRefreshes.delete(cacheKey);
    }
  })();

  inflightRefreshes.set(cacheKey, promise);
  return promise;
}

export async function fetchExternalPriceQuotes(
  itemName: string,
  regionCode?: string | null,
  options?: { forceRefresh?: boolean }
): Promise<PriceQuote[]> {
  await initExternalPriceCache();

  const trimmed = itemName.trim();
  if (!trimmed || externalProviders.length === 0) return [];

  const cacheKey = buildExternalPriceCacheKey(trimmed, regionCode);

  if (!options?.forceRefresh) {
    const cached = getCachedExternalPriceQuotes(cacheKey);
    if (cached) {
      if (cached.isStale) {
        void revalidateExternalPriceQuotes(trimmed, regionCode, cacheKey);
      }
      return cached.quotes;
    }
  }

  const quotes = await fetchExternalPriceQuotesFromProviders(trimmed, regionCode);
  await setCachedExternalPriceQuotes(cacheKey, quotes);
  return quotes;
}
