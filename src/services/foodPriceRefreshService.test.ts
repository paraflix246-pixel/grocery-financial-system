import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getFoodCatalogCanonicalNames } from '@/src/data/groceryCatalog';
import {
  clearExternalPriceCache,
  setCachedExternalPriceQuotes,
  buildExternalPriceCacheKey,
  EXTERNAL_PRICE_STALE_MS,
} from '@/src/services/externalPriceCacheService';
import {
  clearExternalPriceProviders,
  registerExternalPriceProvider,
} from '@/src/services/externalPriceService';
import {
  FOOD_PRICE_INTER_ITEM_DELAY_MS,
  FOOD_PRICE_REFRESH_CONCURRENCY,
} from '@/src/services/foodPriceRefreshService';

describe('food price refresh constants', () => {
  it('exports conservative API throttle defaults', () => {
    assert.equal(FOOD_PRICE_REFRESH_CONCURRENCY, 2);
    assert.ok(FOOD_PRICE_INTER_ITEM_DELAY_MS >= 250);
  });
});

describe('getFoodCatalogCanonicalNames', () => {
  it('includes food categories and excludes household items', () => {
    const names = getFoodCatalogCanonicalNames();
    assert.ok(names.includes('Eggs'));
    assert.ok(names.includes('Milk'));
    assert.ok(!names.includes('Paper Towels'));
    assert.ok(names.length > 100);
  });
});

describe('stale food price detection', () => {
  it('identifies stale vs fresh cached items by timestamp', async () => {
    await clearExternalPriceCache();
    clearExternalPriceProviders();

    registerExternalPriceProvider({
      id: 'test-refresh',
      async getPricesForItem() {
        return [];
      },
    });

    const staleAt = Date.now() - EXTERNAL_PRICE_STALE_MS - 1;
    const eggsKey = buildExternalPriceCacheKey('Eggs', null);
    const milkKey = buildExternalPriceCacheKey('Milk', null);

    await setCachedExternalPriceQuotes(eggsKey, [], staleAt);
    await setCachedExternalPriceQuotes(milkKey, [], Date.now());

    const { getCachedExternalPriceQuotes } = await import(
      '@/src/services/externalPriceCacheService'
    );
    assert.equal(getCachedExternalPriceQuotes(eggsKey)?.isStale, true);
    assert.equal(getCachedExternalPriceQuotes(milkKey)?.isStale, false);
  });
});
