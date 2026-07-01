import { searchCommonsFoodImageClient } from '@/src/services/commons/commonsImageClient';
import {
  buildCommonsImageCacheKey,
  getCachedCommonsFoodImage,
  initCommonsImageCache,
  setCachedCommonsFoodImage,
} from '@/src/services/commons/commonsImageCacheService';
import type { CommonsFoodImage } from '@/src/services/commons/commonsImageTypes';

const inFlight = new Map<string, Promise<CommonsFoodImage | null>>();

export async function fetchCommonsFoodImage(
  term: string,
  options?: { forceRefresh?: boolean }
): Promise<CommonsFoodImage | null> {
  const trimmed = term.trim();
  if (!trimmed) return null;

  await initCommonsImageCache();
  const cacheKey = buildCommonsImageCacheKey(trimmed);

  if (!options?.forceRefresh) {
    const cached = getCachedCommonsFoodImage(cacheKey);
    if (cached && !cached.isStale) {
      return cached.image;
    }
  }

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const request = (async () => {
    const { image } = await searchCommonsFoodImageClient({ term: trimmed });
    await setCachedCommonsFoodImage(cacheKey, image);
    return image;
  })();

  inFlight.set(cacheKey, request);
  try {
    return await request;
  } finally {
    inFlight.delete(cacheKey);
  }
}
