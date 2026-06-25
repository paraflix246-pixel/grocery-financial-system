import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapSerpApiResultsToQuotes,
  normalizeSerpApiStoreName,
} from '@/src/services/serpapi/serpapiParse';
import type { SerpApiShoppingResult } from '@/src/services/serpapi/serpapiTypes';

describe('normalizeSerpApiStoreName', () => {
  it('strips .com suffix', () => {
    assert.equal(normalizeSerpApiStoreName('Walmart.com'), 'Walmart');
  });

  it('keeps plain store names', () => {
    assert.equal(normalizeSerpApiStoreName('Target'), 'Target');
  });
});

describe('mapSerpApiResultsToQuotes', () => {
  const results: SerpApiShoppingResult[] = [
    {
      title: 'Whole Milk',
      source: 'Walmart',
      extracted_price: 2.78,
    },
    {
      title: 'Whole Milk Gallon',
      source: 'Walmart.com',
      extracted_price: 2.18,
    },
    {
      title: 'Fairlife Milk',
      source: 'Target',
      extracted_price: 5.39,
    },
    {
      title: 'Used milk',
      source: 'eBay',
      extracted_price: 1.0,
      second_hand_condition: 'used',
    },
  ];

  it('dedupes by store and keeps lowest price', () => {
    const quotes = mapSerpApiResultsToQuotes(results, 'milk', 5);
    assert.equal(quotes.length, 2);
    assert.equal(quotes[0].storeName, 'Walmart');
    assert.equal(quotes[0].price, 2.18);
    assert.equal(quotes[0].productLabel, 'Whole Milk Gallon');
    assert.equal(quotes[1].storeName, 'Target');
    assert.equal(quotes[0].source, 'api');
  });

  it('skips second-hand listings', () => {
    const quotes = mapSerpApiResultsToQuotes(
      [{ source: 'eBay', extracted_price: 1, second_hand_condition: 'used' }],
      'milk'
    );
    assert.equal(quotes.length, 0);
  });
});
