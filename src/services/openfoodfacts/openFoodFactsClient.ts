import type { PriceQuote } from '@/src/services/priceRecommendationLogic';
import { resolvePublicServiceUrl } from '@/src/utils/productionEnvGuard';

export type OpenFoodFactsSearchResponse = {
  quotes: PriceQuote[];
  error?: string;
};

export type OpenFoodFactsStatusResponse = {
  configured: boolean;
  provider?: string;
  error?: string;
};

function getOpenFoodFactsApiUrl(): string | null {
  return resolvePublicServiceUrl(
    process.env.EXPO_PUBLIC_OPENFOODFACTS_API_URL,
    'EXPO_PUBLIC_OPENFOODFACTS_API_URL',
    '/api/openfoodfacts'
  );
}

export async function getOpenFoodFactsStatus(): Promise<OpenFoodFactsStatusResponse> {
  const url = getOpenFoodFactsApiUrl();
  if (!url) return { configured: false, error: 'Open Food Facts API URL is not configured.' };

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return { configured: false, error: `Open Food Facts status failed (${response.status})` };
    }
    return (await response.json()) as OpenFoodFactsStatusResponse;
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'Open Food Facts status request failed.',
    };
  }
}

export async function searchOpenFoodFactsProducts(input: {
  term: string;
  countryCode?: string;
  limit?: number;
}): Promise<OpenFoodFactsSearchResponse> {
  const url = getOpenFoodFactsApiUrl();
  if (!url) {
    return { quotes: [], error: 'Open Food Facts API URL is not configured.' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        term: input.term,
        countryCode: input.countryCode ?? 'US',
        limit: input.limit ?? 5,
      }),
    });

    const payload = (await response.json()) as OpenFoodFactsSearchResponse & { error?: string };
    if (!response.ok) {
      return {
        quotes: [],
        error: payload.error ?? `Open Food Facts search failed (${response.status})`,
      };
    }

    return { quotes: payload.quotes ?? [] };
  } catch {
    return { quotes: [] };
  }
}
