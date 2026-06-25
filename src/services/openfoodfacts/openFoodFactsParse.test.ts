import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatOpenFoodFactsProductLabel,
  formatOpenFoodFactsStoreName,
  isUsdPrice,
  isUsLocation,
  mapOpenFoodFactsRowsToQuotes,
} from '@/src/services/openfoodfacts/openFoodFactsParse';
import type { OpenFoodFactsPriceRow } from '@/src/services/openfoodfacts/openFoodFactsTypes';

describe('isUsdPrice', () => {
  it('accepts USD currency', () => {
    assert.equal(isUsdPrice({ id: 1, price: 3.99, currency: 'USD' }), true);
  });

  it('rejects EUR and missing currency', () => {
    assert.equal(isUsdPrice({ id: 1, price: 3.99, currency: 'EUR' }), false);
    assert.equal(isUsdPrice({ id: 1, price: 3.99 }), false);
  });
});

describe('isUsLocation', () => {
  it('accepts US country code only', () => {
    assert.equal(
      isUsLocation({ id: 1, price: 1, location: { osm_address_country_code: 'US' } }),
      true
    );
    assert.equal(
      isUsLocation({ id: 1, price: 1, location: { osm_address_country_code: 'CA' } }),
      false
    );
    assert.equal(isUsLocation({ id: 1, price: 1 }), false);
  });
});

describe('formatOpenFoodFactsStoreName', () => {
  it('prefers osm_brand over osm_name', () => {
    const row: OpenFoodFactsPriceRow = {
      id: 1,
      price: 2,
      location: { osm_brand: 'Walmart', osm_name: 'Walmart Supercenter' },
    };
    assert.equal(formatOpenFoodFactsStoreName(row), 'Walmart');
  });

  it('falls back to osm_name then default label', () => {
    assert.equal(
      formatOpenFoodFactsStoreName({
        id: 1,
        price: 2,
        location: { osm_name: 'Target' },
      }),
      'Target'
    );
    assert.equal(formatOpenFoodFactsStoreName({ id: 1, price: 2 }), 'Open Food Facts');
  });
});

describe('formatOpenFoodFactsProductLabel', () => {
  it('combines brand and product name when distinct', () => {
    const label = formatOpenFoodFactsProductLabel({
      id: 1,
      price: 2,
      product: { product_name: 'Whole Milk', brands: 'Great Value' },
    });
    assert.equal(label, 'Great Value Whole Milk');
  });
});

describe('mapOpenFoodFactsRowsToQuotes', () => {
  const rows: OpenFoodFactsPriceRow[] = [
    {
      id: 1,
      price: 4.99,
      currency: 'USD',
      date: '2025-01-15',
      product_name: 'Large Eggs',
      location: { osm_brand: 'Kroger', osm_address_country_code: 'US' },
    },
    {
      id: 2,
      price: 2.49,
      currency: 'EUR',
      product_name: 'Eggs',
      location: { osm_name: 'Carrefour' },
    },
    {
      id: 3,
      price: 0,
      currency: 'USD',
      product_name: 'Invalid',
      location: { osm_name: 'Walmart' },
    },
  ];

  it('maps USD rows to community PriceQuotes and skips EUR', () => {
    const quotes = mapOpenFoodFactsRowsToQuotes(rows, 'eggs', 5);
    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].itemName, 'eggs');
    assert.equal(quotes[0].storeName, 'Kroger');
    assert.equal(quotes[0].price, 4.99);
    assert.equal(quotes[0].source, 'community');
    assert.equal(quotes[0].productLabel, 'Large Eggs');
    assert.equal(quotes[0].date, '2025-01-15');
  });

  it('respects limit', () => {
    const manyUsd: OpenFoodFactsPriceRow[] = [
      { id: 1, price: 1, currency: 'USD', location: { osm_name: 'A', osm_address_country_code: 'US' } },
      { id: 2, price: 2, currency: 'USD', location: { osm_name: 'B', osm_address_country_code: 'US' } },
      { id: 3, price: 3, currency: 'USD', location: { osm_name: 'C', osm_address_country_code: 'US' } },
    ];
    assert.equal(mapOpenFoodFactsRowsToQuotes(manyUsd, 'item', 2).length, 2);
  });
});
