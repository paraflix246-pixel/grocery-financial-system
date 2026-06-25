import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HIDDEN_ITEM_NAME } from '@/src/utils/receiptDraftNormalizer';
import {
  buildLineItemsFromOverlay,
  detectPriceBeforeNameFormat,
  pickOcrDraftLineItems,
  repairSupportedByFragment,
} from '@/src/utils/ocrSpatialLayout';

describe('repairSupportedByFragment', () => {
  it('accepts repairs anchored to visible OCR text', () => {
    assert.equal(repairSupportedByFragment('GAT*', 'GATORADE'), true);
    assert.equal(repairSupportedByFragment('OWELS', 'PAPER TOWELS'), true);
    assert.equal(repairSupportedByFragment('GATE', 'GATORADE'), true);
  });

  it('rejects pure guesses with no fragment evidence', () => {
    assert.equal(repairSupportedByFragment('', 'DOG FOOD'), false);
    assert.equal(repairSupportedByFragment('GAT*', 'PAPER TOWELS'), false);
  });
});

describe('buildLineItemsFromOverlay', () => {
  it('parses Paddle-style single-box receipt rows with trailing prices', () => {
    const result = buildLineItemsFromOverlay([
      {
        top: 10,
        words: [
          {
            text: 'RIBEYE STEAK PK 44.61',
            left: 20,
            top: 10,
            width: 220,
            height: 18,
          },
        ],
      },
    ]);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.name, 'RIBEYE STEAK PK');
    assert.equal(result.items[0]?.price, 44.61);
    assert.notEqual(result.items[0]?.name, HIDDEN_ITEM_NAME);
  });
});

describe('pickOcrDraftLineItems', () => {
  it('prefers text rows when spatial rows are name-price shifted', () => {
    const textItems = [
      { name: 'SPAGHETTI', price: 1.97, quantity: 1 },
      { name: 'CARROTS 2LB', price: 2.44, quantity: 1 },
    ];
    const spatialItems = [
      { name: 'A:T:MATCHAL', price: 1.97, quantity: 1 },
      { name: 'SPAGHETTI', price: 2.44, quantity: 1 },
    ];

    const picked = pickOcrDraftLineItems(textItems, spatialItems, 4.41);

    assert.deepEqual(picked, textItems);
    assert.equal(picked[0]?.name, 'SPAGHETTI');
    assert.equal(picked[0]?.price, 1.97);
  });

  it('prefers text rows for US price-before-name receipts', () => {
    const ocrText = `44.61
RIBEYE STEAK PK
18.72
PORK CHOPS FAMILY PK
19.84
CHICKEN WINGS`;
    assert.equal(detectPriceBeforeNameFormat(ocrText), true);

    const textItems = [
      { name: 'RIBEYE STEAK PK', price: 44.61, quantity: 1 },
      { name: 'PORK CHOPS FAMILY PK', price: 18.72, quantity: 1 },
      { name: 'CHICKEN WINGS', price: 19.84, quantity: 1 },
    ];
    const spatialItems = [
      { name: 'TC8 9194 8821 3375 2048', price: 44.61, quantity: 1 },
      { name: 'RIBEYE STEAK PK', price: 18.72, quantity: 1 },
      { name: 'PORK CHOPS FAMILY PK', price: 19.84, quantity: 1 },
    ];

    const picked = pickOcrDraftLineItems(textItems, spatialItems, 64.73, ocrText);

    assert.deepEqual(picked, textItems);
    assert.equal(picked[0]?.name, 'RIBEYE STEAK PK');
  });
});
