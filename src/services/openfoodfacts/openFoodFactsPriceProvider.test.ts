import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { createOpenFoodFactsPriceProvider } from '@/src/services/openfoodfacts/openFoodFactsPriceProvider';

const ORIGINAL_FETCH = globalThis.fetch;

describe('createOpenFoodFactsPriceProvider', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_OPENFOODFACTS_API_URL = 'http://localhost:8085/api/openfoodfacts';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_OPENFOODFACTS_API_URL;
    globalThis.fetch = ORIGINAL_FETCH;
    mock.restoreAll();
  });

  it('returns community quotes from the proxy response', async () => {
    globalThis.fetch = mock.fn(async () => {
      return new Response(
        JSON.stringify({
          quotes: [
            {
              itemName: 'chicken',
              storeName: 'Whole Foods Market',
              price: 6.49,
              date: '2025-03-01',
              source: 'community',
              productLabel: 'Organic Chicken Thighs',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as typeof fetch;

    const provider = createOpenFoodFactsPriceProvider();
    const quotes = await provider.getPricesForItem('chicken', 'TX');

    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].source, 'community');
    assert.equal(quotes[0].storeName, 'Whole Foods Market');
  });

  it('returns empty array when proxy reports an error', async () => {
    globalThis.fetch = mock.fn(async () => {
      return new Response(JSON.stringify({ quotes: [], error: 'search failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const provider = createOpenFoodFactsPriceProvider();
    const quotes = await provider.getPricesForItem('chicken', 'TX');
    assert.deepEqual(quotes, []);
  });

  it('returns empty array when API URL is not configured', async () => {
    delete process.env.EXPO_PUBLIC_OPENFOODFACTS_API_URL;

    let fetchCalls = 0;
    globalThis.fetch = mock.fn(async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    const provider = createOpenFoodFactsPriceProvider();
    const quotes = await provider.getPricesForItem('chicken', 'TX');

    assert.deepEqual(quotes, []);
    assert.equal(fetchCalls, 0);
  });
});
