import {
  mapWalmartResultsToQuotes,
  parseWalmartSearchHtml,
} from '@/src/services/scraperapi/scraperapiParse';
import type { ScraperApiWalmartSearchResult } from '@/src/services/scraperapi/scraperapiTypes';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';
import { createTimedCache } from '@/src/utils/timedCache';

const SCRAPERAPI_BASE = process.env.SCRAPERAPI_BASE_URL?.trim() || 'https://api.scraperapi.com/';
const WALMART_SEARCH_BASE = 'https://www.walmart.com/search';
const SCRAPER_CACHE_TTL_MS = 30 * 60 * 1000;

const walmartSearchCache = createTimedCache<ScraperApiWalmartSearchResult>(SCRAPER_CACHE_TTL_MS);

export function isScraperApiConfigured(): boolean {
  return Boolean(process.env.SCRAPERAPI_API_KEY?.trim());
}

function getApiKey(): string {
  const apiKey = process.env.SCRAPERAPI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('ScraperAPI is not configured. Set SCRAPERAPI_API_KEY in .env.');
  }
  return apiKey;
}

function buildWalmartSearchUrl(term: string): string {
  const url = new URL(WALMART_SEARCH_BASE);
  url.searchParams.set('q', term);
  return url.toString();
}

async function fetchWalmartSearchHtml(term: string): Promise<string> {
  const targetUrl = buildWalmartSearchUrl(term);
  const apiUrl = new URL(SCRAPERAPI_BASE);
  apiUrl.searchParams.set('api_key', getApiKey());
  apiUrl.searchParams.set('url', targetUrl);
  apiUrl.searchParams.set('country_code', 'us');
  // Walmart search is Next.js-rendered; without JS the HTML often lacks __NEXT_DATA__ products.
  apiUrl.searchParams.set('render', 'true');

  const response = await fetch(apiUrl.toString(), {
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });

  if (!response.ok) {
    throw new Error(`ScraperAPI request failed (${response.status})`);
  }

  return response.text();
}

export async function searchWalmartPrices(term: string): Promise<ScraperApiWalmartSearchResult> {
  const trimmed = term.trim();
  if (!trimmed) return { items: [] };

  const cacheKey = trimmed.toLowerCase();
  const cached = walmartSearchCache.get(cacheKey);
  if (cached) return cached;

  try {
    const html = await fetchWalmartSearchHtml(trimmed);
    const items = parseWalmartSearchHtml(html);
    const result: ScraperApiWalmartSearchResult = { items };
    // Never cache empty parses — a transient ScraperAPI miss should not block Live quotes for 30m.
    if (items.length > 0) {
      walmartSearchCache.set(cacheKey, result);
    } else {
      console.warn(
        'ScraperAPI Walmart search returned no parseable products',
        JSON.stringify({ term: trimmed, htmlLength: html.length, hasNextData: html.includes('__NEXT_DATA__') })
      );
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Walmart scrape failed.';
    console.warn('ScraperAPI Walmart search failed:', message);
    return { items: [], error: message };
  }
}

export async function searchScraperApiProductQuotes(input: {
  term: string;
  limit?: number;
}): Promise<{ quotes: PriceQuote[]; error?: string }> {
  const term = input.term.trim();
  if (!term) return { quotes: [] };

  const result = await searchWalmartPrices(term);
  if (result.error) {
    return { quotes: [], error: result.error };
  }

  return {
    quotes: mapWalmartResultsToQuotes(result.items, term, input.limit ?? 8),
  };
}

/** Clears in-memory Walmart scrape cache between unit tests. */
export function resetScraperApiServerForTests(): void {
  walmartSearchCache.clear();
}
