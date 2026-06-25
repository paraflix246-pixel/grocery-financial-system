import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import {
  isOpenFoodFactsConfigured,
  resetOpenFoodFactsServerForTests,
  searchPricesByName,
} from '@/src/services/openfoodfacts/openFoodFacts.server';

const ORIGINAL_FETCH = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('isOpenFoodFactsConfigured', () => {
  afterEach(() => {
    delete process.env.OPENFOODFACTS_USERNAME;
    delete process.env.OPENFOODFACTS_PASSWORD;
  });

  it('returns false when credentials are missing', () => {
    assert.equal(isOpenFoodFactsConfigured(), false);
  });

  it('returns true when username and password are set', () => {
    process.env.OPENFOODFACTS_USERNAME = 'user';
    process.env.OPENFOODFACTS_PASSWORD = 'pass';
    assert.equal(isOpenFoodFactsConfigured(), true);
  });
});

describe('searchPricesByName', () => {
  beforeEach(() => {
    process.env.OPENFOODFACTS_USERNAME = 'user';
    process.env.OPENFOODFACTS_PASSWORD = 'pass';
    resetOpenFoodFactsServerForTests();
  });

  afterEach(() => {
    delete process.env.OPENFOODFACTS_USERNAME;
    delete process.env.OPENFOODFACTS_PASSWORD;
    globalThis.fetch = ORIGINAL_FETCH;
    resetOpenFoodFactsServerForTests();
    mock.restoreAll();
  });

  it('returns empty array when unconfigured', async () => {
    delete process.env.OPENFOODFACTS_USERNAME;
    delete process.env.OPENFOODFACTS_PASSWORD;

    let fetchCalls = 0;
    globalThis.fetch = mock.fn(async () => {
      fetchCalls += 1;
      return jsonResponse({});
    }) as typeof fetch;

    const quotes = await searchPricesByName({ term: 'chicken' });
    assert.deepEqual(quotes, []);
    assert.equal(fetchCalls, 0);
  });

  it('authenticates and searches by product name contains', async () => {
    const requests: { url: string; method: string }[] = [];

    globalThis.fetch = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, method: init?.method ?? 'GET' });

      if (url.includes('/api/v1/auth')) {
        return jsonResponse({ access_token: 'token-123', expires_in: 3600 });
      }

      if (url.includes('/api/v1/prices')) {
        const parsed = new URL(url);
        assert.equal(parsed.searchParams.get('product_name__contains'), 'chicken');
        assert.equal(parsed.searchParams.get('location__osm_address_country_code'), 'US');
        assert.equal(parsed.searchParams.get('currency'), 'USD');
        assert.equal(parsed.searchParams.get('page_size'), '5');

        return jsonResponse({
          items: [
            {
              id: 1,
              price: 5.99,
              currency: 'USD',
              date: '2025-01-01',
              product_name: 'Chicken Breast',
              location: { osm_name: 'Walmart', osm_address_country_code: 'US' },
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const quotes = await searchPricesByName({ term: 'chicken', countryCode: 'US', limit: 5 });

    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].storeName, 'Walmart');
    assert.equal(quotes[0].price, 5.99);
    assert.equal(quotes[0].source, 'community');
    assert.equal(requests.filter((r) => r.url.includes('/api/v1/auth')).length, 1);
    assert.equal(requests.filter((r) => r.url.includes('/api/v1/prices')).length, 1);
  });

  it('retries search once after 401 and re-authenticates', async () => {
    let priceCalls = 0;

    globalThis.fetch = mock.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/v1/auth')) {
        return jsonResponse({ access_token: 'fresh-token', expires_in: 3600 });
      }

      if (url.includes('/api/v1/prices')) {
        priceCalls += 1;
        if (priceCalls === 1) {
          return new Response('Unauthorized', { status: 401 });
        }

        return jsonResponse({
          items: [
            {
              id: 2,
              price: 3.49,
              currency: 'USD',
              date: '2025-02-01',
              product_name: 'Rotisserie Chicken',
              location: { osm_brand: 'Kroger', osm_address_country_code: 'US' },
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const quotes = await searchPricesByName({ term: 'chicken' });

    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].storeName, 'Kroger');
    assert.equal(priceCalls, 2);
  });

  it('returns empty array when search fails', async () => {
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/v1/auth')) {
        return jsonResponse({ access_token: 'token-123', expires_in: 3600 });
      }
      return new Response('Server error', { status: 500 });
    }) as typeof fetch;

    const quotes = await searchPricesByName({ term: 'chicken' });
    assert.deepEqual(quotes, []);
  });
});
