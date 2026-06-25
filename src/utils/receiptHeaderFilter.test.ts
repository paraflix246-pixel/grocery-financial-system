import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filterPlausibleItemPrices,
  isPlausibleItemPrice,
  looksLikeReceiptHeaderJunk,
  looksLikeSurveyHeaderJunk,
} from '@/src/utils/receiptHeaderFilter';
import { extractItemPricesFromOcrText } from '@/src/utils/ocrPriceSequence';

describe('looksLikeReceiptHeaderJunk', () => {
  it('detects TC#/store#/date mash-ups with phantom prices', () => {
    assert.equal(looksLikeReceiptHeaderJunk('T0R 885 06/0/6//2 P0 885.06'), true);
    assert.equal(looksLikeReceiptHeaderJunk('TC8 9194 8821 3375 2048'), true);
    assert.equal(looksLikeReceiptHeaderJunk('STORE #3885 885.06'), true);
    assert.equal(looksLikeReceiptHeaderJunk('06/08/26 7:02 PM 885.06'), true);
  });

  it('does not flag receipt date/time header lines', () => {
    assert.equal(looksLikeReceiptHeaderJunk('02/25/2026 02:59 PM'), false);
    assert.equal(looksLikeReceiptHeaderJunk('06/08/26 7:02 PM'), false);
  });

  it('does not flag real product lines', () => {
    assert.equal(looksLikeReceiptHeaderJunk('RIBEYE STEAK PK 44.61'), false);
    assert.equal(looksLikeReceiptHeaderJunk('PORK CHOPS FAMILY PK'), false);
    assert.equal(looksLikeReceiptHeaderJunk('TOMATOES ON VINE'), false);
    assert.equal(looksLikeReceiptHeaderJunk('44.61'), false);
  });
});

describe('looksLikeSurveyHeaderJunk', () => {
  it('detects Walmart Canada survey OCR junk above first product', () => {
    assert.equal(looksLikeSurveyHeaderJunk('A:T:MATCHAL'), true);
    assert.equal(looksLikeSurveyHeaderJunk('A : T : MATCHAL'), true);
    assert.equal(looksLikeSurveyHeaderJunk('survey at walmart.ca'), true);
    assert.equal(looksLikeSurveyHeaderJunk('AT MATCHAL'), true);
  });

  it('does not flag real grocery product names', () => {
    assert.equal(looksLikeSurveyHeaderJunk('SPAGHETTI'), false);
    assert.equal(looksLikeSurveyHeaderJunk('MATCHA LATTE'), false);
    assert.equal(looksLikeSurveyHeaderJunk('TOMATOES ON VINE'), false);
  });
});

describe('isPlausibleItemPrice', () => {
  it('rejects header phantom prices above subtotal and grocery cap', () => {
    assert.equal(isPlausibleItemPrice(885.06, { subtotal: 518.85 }), false);
    assert.equal(isPlausibleItemPrice(500, { subtotal: 518.85 }), false);
    assert.equal(isPlausibleItemPrice(44.61, { subtotal: 518.85 }), true);
  });
});

describe('extractItemPricesFromOcrText header junk', () => {
  const known = { subtotal: 518.85, tax: 42.77, total: 561.62 };

  it('skips phantom 885.06 from garbled header line', () => {
    const ocrText = `Walmart
STORE #3885
T0R 885 06/0/6//2 P0 885.06
44.61
RIBEYE STEAK PK
18.72
PORK CHOPS FAMILY PK
518.85
SUBTOTAL`;

    const prices = extractItemPricesFromOcrText(ocrText, known);
    assert.deepEqual(prices.slice(0, 3), [44.61, 18.72]);
    assert.equal(prices.includes(885.06), false);
  });

  it('filterPlausibleItemPrices removes stray header prices', () => {
    const filtered = filterPlausibleItemPrices([885.06, 44.61, 18.72], known);
    assert.deepEqual(filtered, [44.61, 18.72]);
  });
});
