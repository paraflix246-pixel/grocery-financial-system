import { searchScraperApiProducts } from '@/src/services/scraperapi/scraperapiClient';
import type { ExternalPriceSource } from '@/src/services/externalPriceService';

const loggedScraperApiErrors = new Set<string>();

function warnScraperApiLookupSkipped(error: string): void {
  if (loggedScraperApiErrors.has(error)) return;
  loggedScraperApiErrors.add(error);
  console.warn('ScraperAPI Walmart lookup skipped:', error);
}

export function createScraperApiPriceProvider(): ExternalPriceSource {
  return {
    id: 'scraperapi-walmart',
    async getPricesForItem(itemName, _regionCode) {
      const result = await searchScraperApiProducts({
        term: itemName,
        limit: 8,
      });

      if (result.error) {
        const proxyUrl = process.env.EXPO_PUBLIC_SCRAPERAPI_API_URL ?? '';
        const isLocalProxy =
          typeof __DEV__ !== 'undefined' &&
          __DEV__ &&
          (proxyUrl.includes('localhost') || proxyUrl.includes('127.0.0.1'));
        if (!isLocalProxy) {
          warnScraperApiLookupSkipped(result.error);
        }
        return [];
      }

      return result.quotes;
    },
  };
}
