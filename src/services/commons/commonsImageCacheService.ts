import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CommonsFoodImage } from '@/src/services/commons/commonsImageTypes';
import { normalizeCommonsFoodTerm } from '@/src/services/commons/commonsImageLogic';
import { createStaleWhileRevalidateCache } from '@/src/utils/staleWhileRevalidateCache';

/** Wikimedia Commons thumbnails are cached for 7 days per food term. */
export const COMMONS_IMAGE_STALE_MS = 7 * 24 * 60 * 60 * 1000;
export const COMMONS_IMAGE_CACHE_VERSION = 2;

const STORAGE_KEY = '@smartcart_commons_food_image_cache_v2';

type CachedCommonsImage = CommonsFoodImage | null;

type PersistedEntry = {
  image: CachedCommonsImage;
  fetchedAt: number;
};

type PersistedPayload = {
  version: typeof COMMONS_IMAGE_CACHE_VERSION;
  entries: Record<string, PersistedEntry>;
};

const memoryCache = createStaleWhileRevalidateCache<CachedCommonsImage>(COMMONS_IMAGE_STALE_MS);

let loadPromise: Promise<void> | null = null;
let loaded = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function buildCommonsImageCacheKey(term: string): string {
  return normalizeCommonsFoodTerm(term);
}

export function getCachedCommonsFoodImage(
  key: string
): { image: CachedCommonsImage; fetchedAt: number; isStale: boolean } | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  return {
    image: entry.value,
    fetchedAt: entry.fetchedAt,
    isStale: entry.isStale,
  };
}

export async function setCachedCommonsFoodImage(
  key: string,
  image: CachedCommonsImage,
  fetchedAt = Date.now()
): Promise<void> {
  memoryCache.set(key, image, fetchedAt);
  schedulePersist();
}

export async function initCommonsImageCache(): Promise<void> {
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
      if (payload.version !== COMMONS_IMAGE_CACHE_VERSION) {
        loaded = true;
        return;
      }
      for (const [key, entry] of Object.entries(payload.entries ?? {})) {
        memoryCache.set(key, entry.image, entry.fetchedAt);
      }
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
  for (const key of memoryCache.keys()) {
    const entry = memoryCache.get(key);
    if (!entry) continue;
    entries[key] = { image: entry.value, fetchedAt: entry.fetchedAt };
  }

  const payload: PersistedPayload = {
    version: COMMONS_IMAGE_CACHE_VERSION,
    entries,
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore persistence failures (e.g. tests without storage)
  }
}

export async function clearCommonsImageCache(): Promise<void> {
  memoryCache.clear();
  loaded = true;
  loadPromise = Promise.resolve();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Test helper: expose keys currently held in memory. */
export function __listCachedCommonsImageKeysForTests(): string[] {
  return memoryCache.keys();
}
