import type { PriceQuote } from '@/src/services/priceRecommendationLogic';
import { resolveAppApiUrl } from '@/src/utils/appOrigin';
import { resolvePublicServiceUrl } from '@/src/utils/productionEnvGuard';

export type ScraperApiSearchResponse = {
  quotes: PriceQuote[];
  error?: string;
};

export type ScraperApiStatusResponse = {
  configured: boolean;
  provider?: string;
  error?: string;
};

function getScraperApiProxyUrl(): string | null {
  return (
    resolvePublicServiceUrl(
      process.env.EXPO_PUBLIC_SCRAPERAPI_API_URL,
      'EXPO_PUBLIC_SCRAPERAPI_API_URL',
      '/api/scraperapi'
    ) ?? resolveAppApiUrl('/api/scraperapi')
  );
}

export async function getScraperApiStatus(): Promise<ScraperApiStatusResponse> {
  const url = getScraperApiProxyUrl();
  if (!url) return { configured: false, error: 'ScraperAPI proxy URL is not configured.' };

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return { configured: false, error: `ScraperAPI status failed (${response.status})` };
    }
    return (await response.json()) as ScraperApiStatusResponse;
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'ScraperAPI status request failed.',
    };
  }
}

export async function searchScraperApiProducts(input: {
  term: string;
  limit?: number;
}): Promise<ScraperApiSearchResponse> {
  const url = getScraperApiProxyUrl();
  if (!url) {
    return { quotes: [], error: 'ScraperAPI proxy URL is not configured.' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        term: input.term,
        limit: input.limit ?? 8,
      }),
    });

    const payload = (await response.json()) as ScraperApiSearchResponse & { error?: string };
    if (!response.ok) {
      return { quotes: [], error: payload.error ?? `ScraperAPI search failed (${response.status})` };
    }

    return { quotes: payload.quotes ?? [] };
  } catch (error) {
    return {
      quotes: [],
      error: error instanceof Error ? error.message : 'ScraperAPI search request failed.',
    };
  }
}
