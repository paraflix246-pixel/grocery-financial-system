import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

export type SerpApiSearchResponse = {
  quotes: PriceQuote[];
  error?: string;
};

export type SerpApiStatusResponse = {
  configured: boolean;
  provider?: string;
  error?: string;
};

function getSerpApiProxyUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_SERPAPI_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/serpapi`;
  }
  return null;
}

export async function getSerpApiStatus(): Promise<SerpApiStatusResponse> {
  const url = getSerpApiProxyUrl();
  if (!url) return { configured: false, error: 'SerpApi proxy URL is not configured.' };

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return { configured: false, error: `SerpApi status failed (${response.status})` };
    }
    return (await response.json()) as SerpApiStatusResponse;
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'SerpApi status request failed.',
    };
  }
}

export async function searchSerpApiProducts(input: {
  term: string;
  limit?: number;
}): Promise<SerpApiSearchResponse> {
  const url = getSerpApiProxyUrl();
  if (!url) {
    return { quotes: [], error: 'SerpApi proxy URL is not configured.' };
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

    const payload = (await response.json()) as SerpApiSearchResponse & { error?: string };
    if (!response.ok) {
      return { quotes: [], error: payload.error ?? `SerpApi search failed (${response.status})` };
    }

    return { quotes: payload.quotes ?? [] };
  } catch (error) {
    return {
      quotes: [],
      error: error instanceof Error ? error.message : 'SerpApi search request failed.',
    };
  }
}
