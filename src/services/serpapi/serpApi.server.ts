import { mapSerpApiResultsToQuotes } from '@/src/services/serpapi/serpapiParse';
import type { SerpApiShoppingResponse, SerpApiShoppingResult } from '@/src/services/serpapi/serpapiTypes';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

const SERPAPI_BASE = process.env.SERPAPI_BASE_URL?.trim() || 'https://serpapi.com/search.json';

export function isSerpApiConfigured(): boolean {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}

function getApiKey(): string {
  const apiKey = process.env.SERPAPI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('SerpApi is not configured. Set SERPAPI_API_KEY in .env.');
  }
  return apiKey;
}

async function fetchSerpApiShopping(term: string): Promise<SerpApiShoppingResult[]> {
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set('engine', 'google_shopping');
  url.searchParams.set('q', term);
  url.searchParams.set('gl', process.env.SERPAPI_GL?.trim() || 'us');
  url.searchParams.set('hl', process.env.SERPAPI_HL?.trim() || 'en');
  url.searchParams.set('google_domain', 'google.com');
  url.searchParams.set('api_key', getApiKey());

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  const payload = (await response.json()) as SerpApiShoppingResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error ?? `SerpApi search failed (${response.status})`);
  }

  return payload.shopping_results ?? [];
}

export async function searchSerpApiShoppingResults(input: {
  term: string;
  limit?: number;
}): Promise<SerpApiShoppingResult[]> {
  const term = input.term.trim();
  if (!term) return [];
  const results = await fetchSerpApiShopping(term);
  return results.slice(0, input.limit ?? 10);
}

export async function searchSerpApiProductQuotes(input: {
  term: string;
  limit?: number;
}): Promise<{ quotes: PriceQuote[] }> {
  const term = input.term.trim();
  if (!term) return { quotes: [] };

  const results = await fetchSerpApiShopping(term);

  return {
    quotes: mapSerpApiResultsToQuotes(results, term, input.limit ?? 8),
  };
}
