import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clearExternalPriceCache,
  setCachedExternalPriceQuotes,
  buildExternalPriceCacheKey,
} from '@/src/services/externalPriceCacheService';
import {
  clearExternalPriceProviders,
  fetchExternalPriceQuotes,
  registerExternalPriceProvider,
} from '@/src/services/externalPriceService';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

describe('fetchExternalPriceQuotes cache behavior', () => {
  it('returns cached quotes without calling providers when fresh', async () => {
    await clearExternalPriceCache();
    clearExternalPriceProviders();

    let providerCalls = 0;
    registerExternalPriceProvider({
      id: 'test-provider',
      async getPricesForItem() {
        providerCalls += 1;
        return [
          {
            itemName: 'Eggs',
            storeName: 'TestMart',
            price: 2.99,
            date: '',
            source: 'api',
          },
        ] satisfies PriceQuote[];
      },
    });

    const first = await fetchExternalPriceQuotes('Eggs', 'TX');
    assert.equal(first.length, 1);
    assert.equal(providerCalls, 1);

    const second = await fetchExternalPriceQuotes('Eggs', 'TX');
    assert.equal(second.length, 1);
    assert.equal(providerCalls, 1);
  });

  it('forceRefresh bypasses cache', async () => {
    await clearExternalPriceCache();
    clearExternalPriceProviders();

    let providerCalls = 0;
    registerExternalPriceProvider({
      id: 'test-provider-force',
      async getPricesForItem() {
        providerCalls += 1;
        return [
          {
            itemName: 'Milk',
            storeName: 'TestMart',
            price: 3.99,
            date: '',
            source: 'api',
          },
        ] satisfies PriceQuote[];
      },
    });

    await fetchExternalPriceQuotes('Milk', 'TX');
    await fetchExternalPriceQuotes('Milk', 'TX', { forceRefresh: true });
    assert.equal(providerCalls, 2);
  });

  it('serves stale cache immediately and revalidates in background', async () => {
    await clearExternalPriceCache();
    clearExternalPriceProviders();

    const key = buildExternalPriceCacheKey('Bread', 'TX');
    await setCachedExternalPriceQuotes(
      key,
      [
        {
          itemName: 'Bread',
          storeName: 'OldMart',
          price: 1.99,
          date: '',
          source: 'api',
        },
      ],
      Date.now() - 4 * 60 * 60 * 1000
    );

    let providerCalls = 0;
    registerExternalPriceProvider({
      id: 'test-provider-stale',
      async getPricesForItem() {
        providerCalls += 1;
        return [
          {
            itemName: 'Bread',
            storeName: 'NewMart',
            price: 2.49,
            date: '',
            source: 'api',
          },
        ] satisfies PriceQuote[];
      },
    });

    const stale = await fetchExternalPriceQuotes('Bread', 'TX');
    assert.equal(stale[0]?.storeName, 'OldMart');

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(providerCalls, 1);

    const refreshed = await fetchExternalPriceQuotes('Bread', 'TX');
    assert.equal(refreshed[0]?.storeName, 'NewMart');
  });
});
