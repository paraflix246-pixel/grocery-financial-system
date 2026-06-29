import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isRelevantWalmartProduct,
  mapWalmartResultsToQuotes,
  parseWalmartSearchHtml,
  parseWalmartStructuredSearchResponse,
  rankWalmartSearchItems,
} from '@/src/services/scraperapi/scraperapiParse';

const SAMPLE_NEXT_DATA = {
  props: {
    pageProps: {
      initialData: {
        searchResult: {
          itemStacks: [
            {
              items: [
                {
                  __typename: 'Product',
                  name: 'Great Value Ground Beef 80/20, 1 lb',
                  priceInfo: {
                    currentPrice: { price: 5.47, currencyUnit: 'USD' },
                  },
                },
                {
                  __typename: 'Product',
                  name: 'Marketside Ground Beef 85/15, 1 lb',
                  priceInfo: {
                    currentPrice: { price: 6.97, currencyUnit: 'USD' },
                  },
                },
                {
                  __typename: 'AdPlaceholder',
                  name: 'Sponsored',
                  priceInfo: { currentPrice: { price: 1.0 } },
                },
              ],
            },
          ],
        },
      },
    },
  },
};

describe('parseWalmartStructuredSearchResponse', () => {
  it('maps structured search items to title and price', () => {
    const items = parseWalmartStructuredSearchResponse({
      items: [
        {
          name: 'Great Value Ground Beef 80/20, 1 lb',
          price: 5.47,
        },
        {
          name: 'Marketside Ground Beef 85/15, 1 lb',
          price: 6.97,
        },
      ],
    });

    assert.equal(items.length, 2);
    assert.equal(items[0].title, 'Great Value Ground Beef 80/20, 1 lb');
    assert.equal(items[0].price, 5.47);
  });

  it('returns empty array for invalid payloads', () => {
    assert.deepEqual(parseWalmartStructuredSearchResponse(null), []);
    assert.deepEqual(parseWalmartStructuredSearchResponse({ items: 'bad' }), []);
  });
});

describe('parseWalmartSearchHtml', () => {
  it('extracts products from __NEXT_DATA__', () => {
    const html = `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(SAMPLE_NEXT_DATA)}</script></body></html>`;
    const items = parseWalmartSearchHtml(html);

    assert.equal(items.length, 2);
    assert.equal(items[0].title, 'Great Value Ground Beef 80/20, 1 lb');
    assert.equal(items[0].price, 5.47);
    assert.equal(items[1].price, 6.97);
  });

  it('falls back to regex when __NEXT_DATA__ is missing', () => {
    const html = `
      "name":"Organic Whole Milk, 1 Gallon","priceInfo":{"currentPrice":{"price":3.98}}
      "name":"Whole Milk Gallon","priceInfo":{"currentPrice":{"price":2.78}}
    `;
    const items = parseWalmartSearchHtml(html);
    assert.equal(items.length, 2);
    assert.equal(items[0].price, 2.78);
  });

  it('returns empty array for blank HTML', () => {
    assert.deepEqual(parseWalmartSearchHtml(''), []);
  });
});

describe('mapWalmartResultsToQuotes', () => {
  it('maps lowest Walmart price to a Live api quote', () => {
    const quotes = mapWalmartResultsToQuotes(
      [
        { title: 'Ground Beef 1lb', price: 5.47 },
        { title: 'Ground Beef 2lb', price: 9.97 },
      ],
      'ground beef'
    );

    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].storeName, 'Walmart');
    assert.equal(quotes[0].price, 5.47);
    assert.equal(quotes[0].source, 'api');
    assert.equal(quotes[0].productLabel, 'Ground Beef 1lb');
  });

  it('ignores irrelevant Walmart products for the search term', () => {
    const quotes = mapWalmartResultsToQuotes(
      [
        { title: 'Seafood Seasoned Breading Mix', price: 1.98 },
        { title: 'Great Value Ground Beef 80/20, 1 lb', price: 5.47 },
      ],
      'ground beef'
    );

    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].price, 5.47);
    assert.equal(quotes[0].productLabel, 'Great Value Ground Beef 80/20, 1 lb');
  });

  it('returns no quotes when nothing matches the search term', () => {
    const quotes = mapWalmartResultsToQuotes(
      [{ title: 'Seafood Seasoned Breading Mix', price: 1.98 }],
      'ground beef'
    );
    assert.deepEqual(quotes, []);
  });

  it('matches ground beef when search term includes a unit token', () => {
    const quotes = mapWalmartResultsToQuotes(
      [{ title: 'Great Value Ground Beef 80/20, 1 lb', price: 5.47 }],
      'ground beef 1lb'
    );

    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].price, 5.47);
  });
});

describe('rankWalmartSearchItems', () => {
  it('ranks relevant ground beef products ahead of unrelated items', () => {
    const ranked = rankWalmartSearchItems(
      [
        { title: 'Seafood Seasoned Breading Mix', price: 1.98 },
        { title: 'Marketside Ground Beef 85/15, 1 lb', price: 6.97 },
        { title: 'Great Value Ground Beef 80/20, 1 lb', price: 5.47 },
      ],
      'ground beef'
    );

    assert.equal(ranked[0].title, 'Great Value Ground Beef 80/20, 1 lb');
    assert.equal(isRelevantWalmartProduct(ranked[0].title, 'ground beef'), true);
  });
});
