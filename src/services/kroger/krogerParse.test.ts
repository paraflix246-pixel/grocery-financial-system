import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatKrogerStoreLabel,
  krogerQuotesToPriceQuotes,
  mapKrogerProductsToQuotes,
  pickKrogerItemPrice,
} from '@/src/services/kroger/krogerParse';
import type { KrogerProduct, KrogerProductQuote } from '@/src/services/kroger/krogerTypes';

describe('pickKrogerItemPrice', () => {
  it('prefers promo price over regular', () => {
    const price = pickKrogerItemPrice([
      { price: { regular: 4.99, promo: 3.49 }, size: '1 gal' },
    ]);
    assert.equal(price, 3.49);
  });

  it('falls back to regular when promo is missing', () => {
    const price = pickKrogerItemPrice([{ price: { regular: 2.99 } }]);
    assert.equal(price, 2.99);
  });

  it('returns null when no valid price', () => {
    assert.equal(pickKrogerItemPrice([]), null);
    assert.equal(pickKrogerItemPrice([{ price: { regular: 0 } }]), null);
  });
});

describe('mapKrogerProductsToQuotes', () => {
  const products: KrogerProduct[] = [
    {
      productId: '001',
      description: 'Large Eggs',
      brand: 'Kroger',
      items: [{ price: { regular: 3.29 }, size: '12 ct' }],
    },
    {
      productId: '002',
      description: 'Organic Eggs',
      brand: 'Simple Truth',
      items: [{ price: { regular: 5.49, promo: 4.99 }, size: '12 ct' }],
    },
    {
      productId: '003',
      description: 'No Price Item',
      items: [{ price: { regular: 0 } }],
    },
  ];

  it('maps products with prices and respects limit', () => {
    const quotes = mapKrogerProductsToQuotes(products, 'eggs', 'Kroger · Main St', '01400432', 2);
    assert.equal(quotes.length, 2);
    assert.equal(quotes[0].price, 3.29);
    assert.equal(quotes[1].price, 4.99);
    assert.equal(quotes[0].storeName, 'Kroger · Main St');
    assert.equal(quotes[0].locationId, '01400432');
  });
});

describe('krogerQuotesToPriceQuotes', () => {
  it('maps to PriceQuote with api source', () => {
    const krogerQuotes: KrogerProductQuote[] = [
      {
        productId: '001',
        description: 'Milk',
        price: 3.99,
        storeName: 'Kroger · Downtown',
        locationId: '01400432',
      },
    ];
    const quotes = krogerQuotesToPriceQuotes(krogerQuotes, 'Milk');
    assert.equal(quotes.length, 1);
    assert.equal(quotes[0].itemName, 'Milk');
    assert.equal(quotes[0].storeName, 'Kroger · Downtown');
    assert.equal(quotes[0].price, 3.99);
    assert.equal(quotes[0].source, 'api');
    assert.equal(quotes[0].productLabel, 'Milk');
    assert.match(quotes[0].date, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatKrogerStoreLabel', () => {
  it('returns chain only when name is empty', () => {
    assert.equal(formatKrogerStoreLabel('KROGER', ''), 'KROGER');
  });

  it('returns name when it already includes chain', () => {
    assert.equal(formatKrogerStoreLabel('KROGER', 'Kroger Marketplace'), 'Kroger Marketplace');
  });

  it('combines chain and name when distinct', () => {
    assert.equal(formatKrogerStoreLabel('KROGER', 'Main Street'), 'KROGER · Main Street');
  });
});
