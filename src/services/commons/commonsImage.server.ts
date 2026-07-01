import {
  buildCommonsApiUrl,
  buildCommonsFileInfoUrl,
  buildCommonsSearchTerm,
  normalizeCommonsFoodTerm,
  parseCommonsFileInfoResponse,
  parseCommonsSearchResponse,
} from '@/src/services/commons/commonsImageLogic';
import type { CommonsFoodImage } from '@/src/services/commons/commonsImageTypes';
import { lookupCuratedFoodImage } from '@/src/services/commons/curatedFoodImages';
import { isEmojiOnlyFoodKey } from '@/src/services/commons/foodImageValidationLogic';
import { fetchWikipediaLeadFoodImage } from '@/src/services/commons/wikipediaImage.server';
import { createTimedCache } from '@/src/utils/timedCache';

const USER_AGENT = 'PennyPantry/1.0 (grocery-financial-system; contact: dev@pennypantry.app)';
/** Match client cache — 7 days per food term. */
export const COMMONS_IMAGE_SERVER_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

const serverCache = createTimedCache<CommonsFoodImage | null>(COMMONS_IMAGE_SERVER_CACHE_MS);

export function resetCommonsImageServerForTests(): void {
  serverCache.clear();
}

async function fetchCommonsJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Wikimedia Commons request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

async function fetchCuratedCommonsFoodImage(
  normalizedTerm: string
): Promise<CommonsFoodImage | null> {
  const curated = lookupCuratedFoodImage(normalizedTerm);
  if (!curated) return null;

  const url = buildCommonsFileInfoUrl({ fileTitle: curated.fileTitle });
  const payload = await fetchCommonsJson<Parameters<typeof parseCommonsFileInfoResponse>[0]>(url);
  return parseCommonsFileInfoResponse(payload, normalizedTerm, {
    fallbackAuthor: curated.author,
    fallbackLicense: curated.license,
  });
}

async function searchScoredCommonsFoodImage(
  normalizedTerm: string,
  thumbWidth?: number
): Promise<CommonsFoodImage | null> {
  const searchTerm = buildCommonsSearchTerm(normalizedTerm);
  const url = buildCommonsApiUrl({
    searchTerm,
    thumbWidth,
  });

  const payload = await fetchCommonsJson<Parameters<typeof parseCommonsSearchResponse>[0]>(url);
  return parseCommonsSearchResponse(payload, normalizedTerm);
}

export async function searchCommonsFoodImage(input: {
  term: string;
  thumbWidth?: number;
}): Promise<CommonsFoodImage | null> {
  const normalizedTerm = normalizeCommonsFoodTerm(input.term);
  if (!normalizedTerm) return null;

  if (isEmojiOnlyFoodKey(normalizedTerm)) {
    serverCache.set(normalizedTerm, null);
    return null;
  }

  const cached = serverCache.get(normalizedTerm);
  if (cached !== undefined) {
    return cached;
  }

  let image: CommonsFoodImage | null = null;

  try {
    image = await fetchCuratedCommonsFoodImage(normalizedTerm);
  } catch (error) {
    console.warn('Curated Commons image lookup failed:', error);
  }

  if (!image) {
    try {
      image = await fetchWikipediaLeadFoodImage({ term: normalizedTerm });
    } catch (error) {
      console.warn('Wikipedia lead image lookup failed:', error);
    }
  }

  if (!image) {
    image = await searchScoredCommonsFoodImage(normalizedTerm, input.thumbWidth);
  }

  serverCache.set(normalizedTerm, image);
  return image;
}
