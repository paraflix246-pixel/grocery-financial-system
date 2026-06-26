import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ParsedReceiptDraft } from '@/src/models/types';
import { validateParsedReceipt, getConsolidatedBannerMessages, shouldShowInlineSubtotalGap } from './receiptValidation';

const PHOENIX_WALMART_ITEMS: ParsedReceiptDraft['items'] = [
  { name: 'Eggs', price: 3.49, quantity: 1 },
  { name: 'Bread', price: 2.99, quantity: 1 },
  { name: 'Orange Juice', price: 4.29, quantity: 1 },
];

const WATERLOO_WALMART_ITEMS: ParsedReceiptDraft['items'] = [
  { name: 'SPAGHETTI', price: 1.97, quantity: 1 },
  { name: 'CARROTS 2LB', price: 2.44, quantity: 1 },
  { name: 'CHICKEN DRUMSTICKS', price: 7.82, quantity: 1 },
  { name: 'CHIPITS HERSHEY', price: 4.97, quantity: 1 },
  { name: 'BEEF MEDALLION', price: 14.5, quantity: 1 },
  { name: 'SQUASH BUTTERNUT', price: 3.15, quantity: 1 },
  { name: 'RED ONIONS', price: 2.88, quantity: 1 },
  { name: 'TOMATOES ON VINE', price: 4.2, quantity: 1 },
  { name: 'YEAST INSTANT', price: 6.75, quantity: 1 },
  { name: 'MILK 4L', price: 5.29, quantity: 1 },
  { name: 'MILK 4L', price: 5.29, quantity: 1 },
  { name: 'BREAD WHEAT', price: 2.99, quantity: 1 },
];

describe('validateParsedReceipt', () => {
  it('accepts Waterloo Walmart merchandise sum within Canadian HST tolerance', () => {
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-20',
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      printedTaxRate: 13,
      storeRegion: 'ON',
      storeCountry: 'CA',
      items: WATERLOO_WALMART_ITEMS,
    };

    const warnings = validateParsedReceipt(draft, { parseMethod: 'deepread' });
    assert.equal(warnings.includes('items_total_mismatch'), false);
  });

  it('accepts Phoenix Walmart when shelf prices differ from tax-inclusive subtotal', () => {
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-03-23',
      subtotal: 14.77,
      tax: 1.18,
      total: 15.95,
      storeCity: 'Phoenix',
      storeRegion: 'AZ',
      storeCountry: 'US',
      items: PHOENIX_WALMART_ITEMS,
    };

    const warnings = validateParsedReceipt(draft, { parseMethod: 'deepread' });
    assert.equal(warnings.includes('items_total_mismatch'), false);
  });

  it('warns when printed footer is inconsistent with line items', () => {
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-20',
      subtotal: 62.54,
      tax: 2.53,
      total: 70,
      printedTaxRate: 13,
      storeRegion: 'ON',
      storeCountry: 'CA',
      items: WATERLOO_WALMART_ITEMS.map((item) => ({ ...item, price: item.price - 0.1 })),
    };

    const warnings = validateParsedReceipt(draft, { parseMethod: 'deepread' });
    assert.ok(warnings.includes('items_total_mismatch'));
  });

  it('fuses banner messages to at most two lines', () => {
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-20',
      subtotal: 62.54,
      tax: 2.53,
      total: 70,
      items: WATERLOO_WALMART_ITEMS.map((item) => ({ ...item, price: item.price - 0.1 })),
    };
    const messages = getConsolidatedBannerMessages(
      ['ocr_low_confidence', 'items_total_mismatch', 'unscanned_items'],
      draft
    );
    assert.equal(messages.length, 2);
    assert.match(messages[0]!, /may not have been read correctly/i);
    assert.match(messages[1]!, /Line items do not add up/i);
  });

  it('hides inline subtotal gap when banner already warns', () => {
    assert.equal(shouldShowInlineSubtotalGap(['items_total_mismatch']), false);
    assert.equal(shouldShowInlineSubtotalGap(['unscanned_items']), true);
  });
});
