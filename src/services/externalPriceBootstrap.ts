import { initExternalPriceCache } from '@/src/services/externalPriceCacheService';
import { createKrogerPriceProvider } from '@/src/services/kroger/krogerPriceProvider';
import { createOpenFoodFactsPriceProvider } from '@/src/services/openfoodfacts/openFoodFactsPriceProvider';
import { createSerpApiPriceProvider } from '@/src/services/serpapi/serpapiPriceProvider';
import {
  getRegisteredExternalProviderCount,
  registerExternalPriceProvider,
} from '@/src/services/externalPriceService';
import { scheduleBackgroundFoodPriceRefresh } from '@/src/services/foodPriceRefreshService';
import { createSupabaseCommunityPriceProvider } from '@/src/services/communityPricingService';

let bootstrapStarted = false;

/** Register Kroger + SerpApi + Open Food Facts providers once at app startup. */
export async function bootstrapExternalPriceProviders(): Promise<void> {
  if (bootstrapStarted) return;
  bootstrapStarted = true;

  try {
    registerExternalPriceProvider(createSupabaseCommunityPriceProvider());
    registerExternalPriceProvider(createKrogerPriceProvider());
    registerExternalPriceProvider(createSerpApiPriceProvider());
    registerExternalPriceProvider(createOpenFoodFactsPriceProvider());
    await initExternalPriceCache();

    if (getRegisteredExternalProviderCount() === 0) {
      registerExternalPriceProvider({
        id: 'smartcart-api-stub',
        async getPricesForItem(itemName, _regionCode) {
          void itemName;
          return [];
        },
      });
    }

    scheduleBackgroundFoodPriceRefresh();
  } catch (error) {
    console.warn('External price provider bootstrap failed:', error);
  }
}
