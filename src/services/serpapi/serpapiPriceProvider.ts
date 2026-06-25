import { searchSerpApiProducts } from '@/src/services/serpapi/serpapiClient';
import type { ExternalPriceSource } from '@/src/services/externalPriceService';

export function createSerpApiPriceProvider(): ExternalPriceSource {
  return {
    id: 'serpapi-google-shopping',
    async getPricesForItem(itemName, _regionCode) {
      const result = await searchSerpApiProducts({
        term: itemName,
        limit: 8,
      });

      if (result.error) {
        const proxyUrl = process.env.EXPO_PUBLIC_SERPAPI_API_URL ?? '';
        const isLocalProxy =
          typeof __DEV__ !== 'undefined' &&
          __DEV__ &&
          (proxyUrl.includes('localhost') || proxyUrl.includes('127.0.0.1'));
        if (!isLocalProxy) {
          console.warn('SerpApi price lookup skipped:', result.error);
        }
        return [];
      }

      return result.quotes;
    },
  };
}
