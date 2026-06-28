import { getFoodCatalogCanonicalNames } from '@/src/data/groceryCatalog';
import {
  buildExternalPriceCacheKey,
  EXTERNAL_PRICE_STALE_MS,
  getCachedExternalPriceQuotes,
  getCatalogRefreshTimestamps,
  initExternalPriceCache,
  markCatalogRefreshCompleted,
  markCatalogRefreshStarted,
} from '@/src/services/externalPriceCacheService';
import {
  fetchExternalPriceQuotes,
  getRegisteredExternalProviderCount,
} from '@/src/services/externalPriceService';

/** Max concurrent item price refreshes to avoid hammering Kroger/SerpApi. */
export const FOOD_PRICE_REFRESH_CONCURRENCY = 2;

/** Delay between starting consecutive item refreshes within a worker. */
export const FOOD_PRICE_INTER_ITEM_DELAY_MS = 300;

let refreshInFlight: Promise<void> | null = null;
let invalidateDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scheduleComparisonCacheInvalidation(): void {
  if (invalidateDebounceTimer) clearTimeout(invalidateDebounceTimer);
  invalidateDebounceTimer = setTimeout(() => {
    invalidateDebounceTimer = null;
    void import('@/src/services/priceComparisonService')
      .then((mod) => mod.invalidatePriceComparisonCache())
      .catch(() => {});
  }, 1_500);
}

async function runWithConcurrency(
  itemNames: string[],
  concurrency: number,
  delayMs: number,
  worker: (itemName: string) => Promise<void>
): Promise<void> {
  const queue = [...itemNames];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      const itemName = queue.shift();
      if (!itemName) break;
      await worker(itemName);
      if (queue.length > 0 && delayMs > 0) {
        await sleep(delayMs);
      }
    }
  });
  await Promise.all(workers);
}

export async function collectItemsNeedingRefresh(
  priorityNames: string[] = []
): Promise<string[]> {
  await initExternalPriceCache();
  const { getEffectiveComparisonRegion } = await import('@/src/utils/regionPreference');
  const region = await getEffectiveComparisonRegion();
  const seen = new Set<string>();
  const stale: string[] = [];

  const consider = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const cacheKey = buildExternalPriceCacheKey(trimmed, region);
    const cached = getCachedExternalPriceQuotes(cacheKey);
    if (!cached || cached.isStale || cached.quotes.length === 0) {
      stale.push(trimmed);
    }
  };

  for (const name of priorityNames) consider(name);
  for (const name of getFoodCatalogCanonicalNames()) consider(name);

  return stale;
}

export async function refreshFoodPricesInBackground(options?: {
  itemNames?: string[];
  force?: boolean;
}): Promise<void> {
  if (getRegisteredExternalProviderCount() === 0) return;

  await initExternalPriceCache();

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const { getEffectiveComparisonRegion } = await import('@/src/utils/regionPreference');
      const region = await getEffectiveComparisonRegion();
      let itemNames = options?.itemNames;

      if (!itemNames || itemNames.length === 0) {
        const { resolveComparisonList } = await import('@/src/services/listComparisonService');
        const comparison = await resolveComparisonList();
        const priorityNames = (comparison?.items ?? []).map((item) => item.name);
        itemNames = await collectItemsNeedingRefresh(priorityNames);
      } else if (options?.force) {
        itemNames = [...new Set(itemNames.map((name) => name.trim()).filter(Boolean))];
      } else {
        const stale = await collectItemsNeedingRefresh(itemNames);
        itemNames = stale;
      }

      if (itemNames.length === 0) return;

      await markCatalogRefreshStarted();

      await runWithConcurrency(
        itemNames,
        FOOD_PRICE_REFRESH_CONCURRENCY,
        FOOD_PRICE_INTER_ITEM_DELAY_MS,
        async (itemName) => {
          try {
            await fetchExternalPriceQuotes(itemName, region, { forceRefresh: true });
            scheduleComparisonCacheInvalidation();
          } catch (error) {
            console.warn(`Background price refresh failed for "${itemName}":`, error);
          }
        }
      );

      await markCatalogRefreshCompleted();
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Kick off a catalog refresh when the last full sweep is older than the stale window. */
export function scheduleBackgroundFoodPriceRefresh(): void {
  void (async () => {
    try {
      if (getRegisteredExternalProviderCount() === 0) return;
      await initExternalPriceCache();

      const { lastCatalogRefreshCompletedAt } = getCatalogRefreshTimestamps();
      const catalogIsFresh =
        lastCatalogRefreshCompletedAt != null &&
        Date.now() - lastCatalogRefreshCompletedAt < EXTERNAL_PRICE_STALE_MS;

      if (catalogIsFresh) return;

      await refreshFoodPricesInBackground();
    } catch (error) {
      console.warn('Background food price refresh scheduling failed:', error);
    }
  })();
}

export function __resetFoodPriceRefreshStateForTests(): void {
  refreshInFlight = null;
  if (invalidateDebounceTimer) {
    clearTimeout(invalidateDebounceTimer);
    invalidateDebounceTimer = null;
  }
}
