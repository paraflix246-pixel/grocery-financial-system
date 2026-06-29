import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PriceQuote } from '@/src/services/priceRecommendationLogic';
import { createStaleWhileRevalidateCache } from '@/src/utils/staleWhileRevalidateCache';

/** External API prices are considered fresh for 3 hours; stale entries are served while revalidating. */
export const EXTERNAL_PRICE_STALE_MS = 3 * 60 * 60 * 1000;

/** Bump when cache shape or provider set changes (e.g. ScraperAPI added) to drop stale AsyncStorage entries. */
export const EXTERNAL_PRICE_CACHE_VERSION = 4;

const STORAGE_KEY = '@smartcart_external_price_cache_v4';

type PersistedEntry = {
  quotes: PriceQuote[];
  fetchedAt: number;
};

type PersistedPayload = {
  version: typeof EXTERNAL_PRICE_CACHE_VERSION;
  entries: Record<string, PersistedEntry>;
  lastCatalogRefreshStartedAt: number | null;
  lastCatalogRefreshCompletedAt: number | null;
};

const memoryCache = createStaleWhileRevalidateCache<PriceQuote[]>(EXTERNAL_PRICE_STALE_MS);

let loadPromise: Promise<void> | null = null;
let loaded = false;
let lastCatalogRefreshStartedAt: number | null = null;
let lastCatalogRefreshCompletedAt: number | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function normalizeItemKey(itemName: string): string {
  return itemName.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildExternalPriceCacheKey(
  itemName: string,
  regionCode?: string | null
): string {
  const region = regionCode?.trim().toUpperCase() || 'DEFAULT';
  return `${normalizeItemKey(itemName)}|${region}`;
}

export function isExternalPriceStale(fetchedAt: number): boolean {
  return memoryCache.isStale(fetchedAt);
}

export function getCachedExternalPriceQuotes(
  key: string
): { quotes: PriceQuote[]; fetchedAt: number; isStale: boolean } | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  return {
    quotes: entry.value,
    fetchedAt: entry.fetchedAt,
    isStale: entry.isStale,
  };
}

export async function setCachedExternalPriceQuotes(
  key: string,
  quotes: PriceQuote[],
  fetchedAt = Date.now()
): Promise<void> {
  memoryCache.set(key, quotes, fetchedAt);
  schedulePersist();
}

export function getCatalogRefreshTimestamps(): {
  lastCatalogRefreshStartedAt: number | null;
  lastCatalogRefreshCompletedAt: number | null;
} {
  return { lastCatalogRefreshStartedAt, lastCatalogRefreshCompletedAt };
}

export async function markCatalogRefreshStarted(): Promise<void> {
  lastCatalogRefreshStartedAt = Date.now();
  schedulePersist();
}

export async function markCatalogRefreshCompleted(): Promise<void> {
  lastCatalogRefreshCompletedAt = Date.now();
  schedulePersist();
}

export async function initExternalPriceCache(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        loaded = true;
        return;
      }
      const payload = JSON.parse(raw) as PersistedPayload;
      if (payload.version !== EXTERNAL_PRICE_CACHE_VERSION) {
        loaded = true;
        return;
      }
      for (const [key, entry] of Object.entries(payload.entries ?? {})) {
        memoryCache.set(key, entry.quotes, entry.fetchedAt);
      }
      lastCatalogRefreshStartedAt = payload.lastCatalogRefreshStartedAt ?? null;
      lastCatalogRefreshCompletedAt = payload.lastCatalogRefreshCompletedAt ?? null;
    } catch {
      // ignore corrupt cache
    } finally {
      loaded = true;
    }
  })();

  return loadPromise;
}

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistCache();
  }, 500);
}

async function persistCache(): Promise<void> {
  const entries: Record<string, PersistedEntry> = {};
  for (const key of listMemoryKeys()) {
    const entry = memoryCache.get(key);
    if (!entry) continue;
    entries[key] = { quotes: entry.value, fetchedAt: entry.fetchedAt };
  }

  const payload: PersistedPayload = {
    version: EXTERNAL_PRICE_CACHE_VERSION,
    entries,
    lastCatalogRefreshStartedAt,
    lastCatalogRefreshCompletedAt,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore persistence failures (e.g. tests without storage)
  }
}

function listMemoryKeys(): string[] {
  return memoryCache.keys();
}

export async function clearExternalPriceCache(): Promise<void> {
  memoryCache.clear();
  lastCatalogRefreshStartedAt = null;
  lastCatalogRefreshCompletedAt = null;
  loaded = true;
  loadPromise = Promise.resolve();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Test helper: expose keys currently held in memory. */
export function __listCachedExternalPriceKeysForTests(): string[] {
  return listMemoryKeys();
}
