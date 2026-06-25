import { mapOpenFoodFactsRowsToQuotes } from '@/src/services/openfoodfacts/openFoodFactsParse';
import type {
  OpenFoodFactsAuthResponse,
  OpenFoodFactsPricesResponse,
} from '@/src/services/openfoodfacts/openFoodFactsTypes';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

const OPEN_PRICES_BASE =
  process.env.OPENFOODFACTS_API_BASE_URL?.trim() || 'https://prices.openfoodfacts.org';

type TokenCache = {
  token: string;
  expiresAtMs: number;
};

let tokenCache: TokenCache | null = null;

export function isOpenFoodFactsConfigured(): boolean {
  return Boolean(
    process.env.OPENFOODFACTS_USERNAME?.trim() && process.env.OPENFOODFACTS_PASSWORD?.trim()
  );
}

function getCredentials(): { username: string; password: string } {
  const username = process.env.OPENFOODFACTS_USERNAME?.trim();
  const password = process.env.OPENFOODFACTS_PASSWORD?.trim();
  if (!username || !password) {
    throw new Error(
      'Open Food Facts is not configured. Set OPENFOODFACTS_USERNAME and OPENFOODFACTS_PASSWORD in .env.'
    );
  }
  return { username, password };
}

function clearTokenCache(): void {
  tokenCache = null;
}

/** Clears cached auth token between unit tests. */
export function resetOpenFoodFactsServerForTests(): void {
  clearTokenCache();
}

async function fetchOpenFoodFactsToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAtMs - 60_000) {
    return tokenCache.token;
  }

  const { username, password } = getCredentials();
  const body = new URLSearchParams({ username, password });

  const response = await fetch(`${OPEN_PRICES_BASE}/api/v1/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Open Food Facts auth failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const payload = (await response.json()) as OpenFoodFactsAuthResponse;
  const token = payload.access_token?.trim() || payload.token?.trim();
  if (!token) {
    throw new Error('Open Food Facts auth returned no token.');
  }

  const expiresInSec = typeof payload.expires_in === 'number' ? payload.expires_in : 3600;
  tokenCache = {
    token,
    expiresAtMs: Date.now() + expiresInSec * 1000,
  };
  return token;
}

async function openFoodFactsGet<T>(
  path: string,
  params: Record<string, string>,
  retried = false
): Promise<T> {
  const url = new URL(`${OPEN_PRICES_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const token = await fetchOpenFoodFactsToken();
  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 && !retried) {
    clearTokenCache();
    return openFoodFactsGet<T>(path, params, true);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Open Food Facts ${path} failed (${response.status}): ${text.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

export async function searchPricesByName(input: {
  term: string;
  countryCode?: string;
  limit?: number;
}): Promise<PriceQuote[]> {
  const term = input.term.trim();
  if (!term || !isOpenFoodFactsConfigured()) return [];

  const limit = Math.min(input.limit ?? 5, 20);
  const countryCode = input.countryCode?.trim().toUpperCase() || 'US';

  try {
    const payload = await openFoodFactsGet<OpenFoodFactsPricesResponse>('/api/v1/prices', {
      product_name__contains: term,
      location__osm_address_country_code: countryCode,
      currency: 'USD',
      page_size: String(limit),
    });

    return mapOpenFoodFactsRowsToQuotes(payload.items ?? [], term, limit);
  } catch {
    return [];
  }
}
