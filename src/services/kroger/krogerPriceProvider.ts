import { searchKrogerProducts } from '@/src/services/kroger/krogerClient';
import type { ExternalPriceSource } from '@/src/services/externalPriceService';
import { getEffectiveKrogerZipCode } from '@/src/utils/regionPreference';

export function createKrogerPriceProvider(): ExternalPriceSource {
  return {
    id: 'kroger',
    async getPricesForItem(itemName, _regionCode) {
      const zipCode = await getEffectiveKrogerZipCode();
      const result = await searchKrogerProducts({
        term: itemName,
        zipCode,
        limit: 5,
      });

      if (result.error) {
        const proxyUrl = process.env.EXPO_PUBLIC_KROGER_API_URL ?? '';
        const isLocalProxy =
          typeof __DEV__ !== 'undefined' &&
          __DEV__ &&
          (proxyUrl.includes('localhost') || proxyUrl.includes('127.0.0.1'));
        if (!isLocalProxy) {
          console.warn('Kroger price lookup skipped:', result.error);
        }
        return [];
      }

      return result.quotes;
    },
  };
}
