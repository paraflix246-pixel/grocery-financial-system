import {
  formatKrogerStoreLabel,
  krogerQuotesToPriceQuotes,
  mapKrogerProductsToPromoItems,
  mapKrogerProductsToQuotes,
} from '@/src/services/kroger/krogerParse';
import type {
  KrogerLocationsResponse,
  KrogerProductsResponse,
  KrogerTokenResponse,
} from '@/src/services/kroger/krogerTypes';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

const KROGER_API_BASE = process.env.KROGER_API_BASE_URL?.trim() || 'https://api.kroger.com';

type TokenCache = {
  token: string;
  expiresAtMs: number;
};

let tokenCache: TokenCache | null = null;

export function isKrogerConfigured(): boolean {
  return Boolean(process.env.KROGER_CLIENT_ID?.trim() && process.env.KROGER_CLIENT_SECRET?.trim());
}

function getCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.KROGER_CLIENT_ID?.trim();
  const clientSecret = process.env.KROGER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Kroger API is not configured. Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in .env.');
  }
  return { clientId, clientSecret };
}

async function fetchKrogerAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAtMs - 60_000) {
    return tokenCache.token;
  }

  const { clientId, clientSecret } = getCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${KROGER_API_BASE}/v1/connect/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kroger auth failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const payload = (await response.json()) as KrogerTokenResponse;
  tokenCache = {
    token: payload.access_token,
    expiresAtMs: Date.now() + payload.expires_in * 1000,
  };
  return payload.access_token;
}

async function krogerGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const token = await fetchKrogerAccessToken();
  const url = new URL(`${KROGER_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kroger API ${path} failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

export async function findKrogerLocation(input: {
  locationId?: string | null;
  zipCode?: string | null;
}): Promise<{ locationId: string; storeName: string } | null> {
  const envLocationId = process.env.KROGER_LOCATION_ID?.trim();
  const locationId = input.locationId?.trim() || envLocationId;
  if (locationId) {
    return { locationId, storeName: 'Kroger' };
  }

  const zip = input.zipCode?.trim().replace(/\s+/g, '');
  if (!zip || zip.length < 5) return null;

  const payload = await krogerGet<KrogerLocationsResponse>('/v1/locations', {
    'filter.zipCode.near': zip.slice(0, 5),
    'filter.limit': '1',
  });
  const location = payload.data?.[0];
  if (!location?.locationId) return null;
  return {
    locationId: location.locationId,
    storeName: formatKrogerStoreLabel(location.chain, location.name),
  };
}

export async function searchKrogerProductQuotes(input: {
  term: string;
  locationId?: string | null;
  zipCode?: string | null;
  limit?: number;
}): Promise<{ quotes: PriceQuote[]; locationId: string | null; storeName: string | null }> {
  const term = input.term.trim();
  if (!term) return { quotes: [], locationId: null, storeName: null };

  const location = await findKrogerLocation({
    locationId: input.locationId,
    zipCode: input.zipCode,
  });
  if (!location) {
    return { quotes: [], locationId: null, storeName: null };
  }

  const payload = await krogerGet<KrogerProductsResponse>('/v1/products', {
    'filter.term': term,
    'filter.locationId': location.locationId,
    'filter.limit': String(Math.min(input.limit ?? 8, 20)),
  });

  const productQuotes = mapKrogerProductsToQuotes(
    payload.data ?? [],
    term,
    location.storeName,
    location.locationId,
    input.limit ?? 5
  );

  return {
    quotes: krogerQuotesToPriceQuotes(productQuotes, term),
    locationId: location.locationId,
    storeName: location.storeName,
  };
}

const KROGER_DEAL_SEARCHES = [
  { term: 'produce', category: 'Produce', emoji: '🥬' },
  { term: 'chicken', category: 'Meat', emoji: '🍗' },
  { term: 'milk', category: 'Dairy', emoji: '🥛' },
  { term: 'snacks', category: 'Snacks', emoji: '🍿' },
  { term: 'paper towels', category: 'Household', emoji: '🧻' },
] as const;

export async function searchKrogerPromoDeals(input: {
  zipCode?: string | null;
  locationId?: string | null;
  limit?: number;
}): Promise<{
  promos: ReturnType<typeof mapKrogerProductsToPromoItems>;
  locationId: string | null;
  storeName: string | null;
}> {
  const limit = Math.min(input.limit ?? 8, 12);
  const location = await findKrogerLocation({
    locationId: input.locationId,
    zipCode: input.zipCode,
  });
  if (!location) {
    return { promos: [], locationId: null, storeName: null };
  }

  const promos: ReturnType<typeof mapKrogerProductsToPromoItems> = [];
  const seen = new Set<string>();

  for (const search of KROGER_DEAL_SEARCHES) {
    if (promos.length >= limit) break;

    const payload = await krogerGet<KrogerProductsResponse>('/v1/products', {
      'filter.term': search.term,
      'filter.locationId': location.locationId,
      'filter.limit': '20',
    });

    const batch = mapKrogerProductsToPromoItems(
      payload.data ?? [],
      location.storeName,
      location.locationId,
      limit - promos.length
    );

    for (const promo of batch) {
      if (seen.has(promo.productId)) continue;
      seen.add(promo.productId);
      promos.push(promo);
      if (promos.length >= limit) break;
    }
  }

  return {
    promos,
    locationId: location.locationId,
    storeName: location.storeName,
  };
}
