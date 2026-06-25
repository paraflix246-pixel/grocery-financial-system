import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildExternalPriceCacheKey,
  clearExternalPriceCache,
  getCachedExternalPriceQuotes,
  isExternalPriceStale,
  setCachedExternalPriceQuotes,
} from '@/src/services/externalPriceCacheService';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';
import { EXTERNAL_PRICE_STALE_MS } from '@/src/services/externalPriceCacheService';

const sampleQuotes: PriceQuote[] = [
  {
    itemName: 'Eggs',
    storeName: 'Kroger',
    price: 3.49,
    date: '',
    source: 'api',
  },
];

describe('externalPriceCacheService', () => {
  it('builds stable cache keys from item name and region', () => {
    assert.equal(buildExternalPriceCacheKey('  Eggs ', 'tx'), 'eggs|TX');
    assert.equal(buildExternalPriceCacheKey('Milk'), 'milk|DEFAULT');
  });

  it('stores and retrieves quotes with stale detection', async () => {
    await clearExternalPriceCache();
    const key = buildExternalPriceCacheKey('Eggs', 'TX');
    const fetchedAt = Date.now() - EXTERNAL_PRICE_STALE_MS - 1;

    await setCachedExternalPriceQuotes(key, sampleQuotes, fetchedAt);
    const cached = getCachedExternalPriceQuotes(key);

    assert.ok(cached);
    assert.equal(cached.quotes.length, 1);
    assert.equal(cached.isStale, true);
    assert.equal(isExternalPriceStale(fetchedAt), true);
  });

  it('returns null for missing cache entries', async () => {
    await clearExternalPriceCache();
    assert.equal(getCachedExternalPriceQuotes('missing|DEFAULT'), null);
  });
});
