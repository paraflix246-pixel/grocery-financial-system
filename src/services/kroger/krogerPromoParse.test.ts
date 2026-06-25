import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatKrogerPromoDiscount,
  mapKrogerProductsToPromoItems,
  pickKrogerPromoPrices,
} from '@/src/services/kroger/krogerParse';

describe('kroger promo parsing', () => {
  it('detects promo prices below regular', () => {
    assert.deepEqual(pickKrogerPromoPrices({ price: { regular: 4.99, promo: 3.49 } }), {
      promo: 3.49,
      regular: 4.99,
    });
    assert.equal(pickKrogerPromoPrices({ price: { regular: 3.49, promo: 3.49 } }), null);
    assert.equal(pickKrogerPromoPrices({ price: { regular: 2.99 } }), null);
  });

  it('formats percent and dollar discounts', () => {
    assert.equal(formatKrogerPromoDiscount(10, 8), '20% off');
    assert.equal(formatKrogerPromoDiscount(4.99, 4.6), '$0.39 off');
  });

  it('maps products with active promos only', () => {
    const promos = mapKrogerProductsToPromoItems(
      [
        {
          productId: '111',
          description: 'Organic Milk',
          brand: 'Simple Truth',
          items: [{ price: { regular: 4.99, promo: 3.99 }, size: '1 gal' }],
        },
        {
          productId: '222',
          description: 'Bread',
          items: [{ price: { regular: 2.49 } }],
        },
      ],
      'Kroger',
      '01400432',
      5
    );

    assert.equal(promos.length, 1);
    assert.equal(promos[0].productId, '111');
    assert.equal(promos[0].promoPrice, 3.99);
  });
});
