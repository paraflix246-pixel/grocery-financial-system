import { createTimedCache } from '@/src/utils/timedCache';
import {
  parseNominatimResults,
  type NominatimSearchResult,
} from '@/src/utils/nominatimAddress';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'PennyPantry/1.0 (grocery-financial-system; contact: dev@pennypantry.app)';
const MIN_REQUEST_INTERVAL_MS = 1100;
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = createTimedCache<NominatimSearchResult[]>(CACHE_TTL_MS);
let lastRequestAt = 0;

function cacheKey(query: string, limit: number): string {
  return `${query.trim().toLowerCase()}::${limit}`;
}

async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

export async function searchNominatimAddresses(input: {
  query: string;
  limit?: number;
}): Promise<Array<{ label: string; storeAddress?: string; storeCity?: string; storeRegion?: string; storePostalCode?: string; storeCountry?: string }>> {
  const query = input.query.trim();
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);
  if (query.length < 3) {
    return [];
  }

  const key = cacheKey(query, limit);
  const cached = cache.get(key);
  if (cached) {
    return parseNominatimResults(cached);
  }

  await waitForRateLimit();

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('countrycodes', 'us,ca');

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim search failed (${response.status})`);
  }

  const payload = (await response.json()) as NominatimSearchResult[];
  cache.set(key, payload);
  return parseNominatimResults(payload);
}
