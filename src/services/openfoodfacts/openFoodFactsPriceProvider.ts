import { searchOpenFoodFactsProducts } from '@/src/services/openfoodfacts/openFoodFactsClient';
import type { ExternalPriceSource } from '@/src/services/externalPriceService';

export function createOpenFoodFactsPriceProvider(): ExternalPriceSource {
  return {
    id: 'openfoodfacts',
    async getPricesForItem(itemName, _regionCode) {
      const result = await searchOpenFoodFactsProducts({
        term: itemName,
        countryCode: 'US',
        limit: 5,
      });

      if (result.error) {
        return [];
      }

      return result.quotes;
    },
  };
}
