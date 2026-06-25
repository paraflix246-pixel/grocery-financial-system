import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HIDDEN_ITEM_NAME } from '@/src/utils/receiptDraftNormalizer';
import { shouldSuggestRescanForObstructedReceipt, hasConsistentPrintedFooter, getTotalsMatchDetail, getTotalsMatchGist, itemsSumMatchesSubtotal, formatItemsSubtotalGapDetail, getItemsSubtotalGap } from '@/src/utils/receiptItemLabels';

const hidden = { name: HIDDEN_ITEM_NAME };
const named = (name: string) => ({ name });

describe('shouldSuggestRescanForObstructedReceipt', () => {
  it('does not suggest rescan when only trailing lines are unreadable', () => {
    const items = [
      ...Array.from({ length: 18 }, (_, i) => named(`ITEM ${i + 1}`)),
      hidden,
      hidden,
      hidden,
      hidden,
    ];
    assert.equal(
      shouldSuggestRescanForObstructedReceipt({ items, ocrConfidence: 80 }),
      false
    );
  });

  it('suggests rescan for a mid-receipt block of unreadable rows (thumb/finger)', () => {
    const items = [
      ...Array.from({ length: 7 }, (_, i) => named(`ITEM ${i + 1}`)),
      hidden,
      hidden,
      hidden,
      hidden,
      hidden,
      named('PRODUCE'),
      named('CLEANING ITEMS'),
      hidden,
      hidden,
    ];
    assert.equal(
      shouldSuggestRescanForObstructedReceipt({ items, ocrConfidence: 80 }),
      true
    );
  });

  it('suggests rescan for low OCR confidence with multiple failed rows', () => {
    const items = [named('MILK'), hidden, hidden, named('EGGS'), hidden];
    assert.equal(
      shouldSuggestRescanForObstructedReceipt({ items, ocrConfidence: 50 }),
      true
    );
  });
});

describe('hasConsistentPrintedFooter', () => {
  it('accepts standard subtotal + tax = total footers', () => {
    assert.equal(
      hasConsistentPrintedFooter({ subtotal: 14.77, tax: 1.18, total: 15.95 }),
      true
    );
  });

  it('accepts Canadian HST-inclusive footers where subtotal equals total', () => {
    assert.equal(
      hasConsistentPrintedFooter({ subtotal: 62.54, tax: 2.53, total: 62.54 }),
      true
    );
  });
});

describe('itemsSumMatchesSubtotal', () => {
  it('accepts Waterloo Walmart merchandise sum within Canadian HST tolerance', () => {
    const items = [
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
    assert.equal(
      itemsSumMatchesSubtotal({ items, subtotal: 62.54, tax: 2.53, total: 62.54 }),
      true
    );
  });
});

describe('getItemsSubtotalGap', () => {
  it('returns null for Waterloo Walmart $0.29 shortfall within Canadian tolerance', () => {
    const items = [
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
    const gap = getItemsSubtotalGap({ items, subtotal: 62.54, tax: 2.53, total: 62.54 });
    assert.equal(gap, null);
  });
});

describe('formatItemsSubtotalGapDetail', () => {
  const waterlooItems = [
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

  it('returns null gap detail for Canadian HST receipt within tolerance', () => {
    const detail = formatItemsSubtotalGapDetail({
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      items: waterlooItems,
    });
    assert.equal(detail, null);
  });

  it('returns null gap detail when footer is consistent (shelf vs tax-inclusive subtotal)', () => {
    const detail = formatItemsSubtotalGapDetail({
      subtotal: 14.77,
      tax: 1.18,
      total: 15.95,
      items: [
        { name: 'Eggs', price: 3.49, quantity: 1 },
        { name: 'Bread', price: 2.99, quantity: 1 },
        { name: 'Orange Juice', price: 4.29, quantity: 1 },
      ],
    });
    assert.equal(detail, null);
  });

  it('notes missing items when printed footer is broken', () => {
    const detail = formatItemsSubtotalGapDetail({
      subtotal: 14.77,
      tax: 1.18,
      total: 18,
      items: [
        { name: 'Eggs', price: 3.49, quantity: 1 },
        { name: 'Bread', price: 2.99, quantity: 1 },
        { name: 'Orange Juice', price: 4.29, quantity: 1 },
      ],
    });
    assert.match(detail ?? '', /missing items or misread prices/i);
    assert.match(detail ?? '', /\$4\.00 short/);
  });
});

describe('getTotalsMatchDetail', () => {
  it('reports totals match for tax-inclusive footer within Canadian tolerance', () => {
    const detail = getTotalsMatchDetail({
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      items: [
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
      ],
    });
    assert.equal(detail, 'Totals match');
  });
});

describe('getTotalsMatchGist', () => {
  it('returns Totals match for Phoenix Walmart tax-inclusive subtotal footer', () => {
    const gist = getTotalsMatchGist({
      subtotal: 14.77,
      tax: 1.18,
      total: 15.95,
      items: [
        { name: 'Eggs', price: 3.49, quantity: 1 },
        { name: 'Bread', price: 2.99, quantity: 1 },
        { name: 'Orange Juice', price: 4.29, quantity: 1 },
      ],
    });
    assert.equal(gist, 'Totals match');
  });

  it('returns short gist without dollar amounts', () => {
    const gist = getTotalsMatchGist({
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      items: [
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
      ],
    });
    assert.equal(gist, 'Totals match');
  });

  it('uses name heuristics when lineKind tags are missing on Canadian HST receipt', () => {
    const items = [
      { name: 'SPAGHETTI', price: 1.97, quantity: 1 },
      { name: 'CARROTS 2LB', price: 2.44, quantity: 1 },
      { name: 'CHICKEN DRUMSTICKS', price: 7.82, quantity: 1 },
      { name: 'CHIPITS HERSHEY', price: 4.97, quantity: 1 },
      { name: 'BEEF MEDALLION', price: 14.5, quantity: 1 },
      { name: 'SQUASH BUTTERNUT', price: 3.15, quantity: 1 },
      { name: 'RED ONIONS', price: 2.88, quantity: 1 },
      { name: 'TOMATOES ON VINE', price: 4.2, quantity: 1 },
      { name: 'CHARGE PYMT D68 QTY 1', price: 4.06, quantity: 1 },
      { name: 'YEAST INSTANT', price: 6.75, quantity: 1 },
      { name: 'MILK 4L', price: 5.29, quantity: 1 },
      { name: 'MILK 4L', price: 5.29, quantity: 1 },
      { name: 'BREAD WHEAT', price: 2.99, quantity: 1 },
      { name: 'BREAD ONLY', price: 2.99, quantity: 1 },
      { name: 'CARATOES WHEAT', price: 2.99, quantity: 1 },
      { name: 'SH TOMRTH', price: 1.99, quantity: 1 },
      { name: 'UMBERY DIS', price: 2.99, quantity: 1 },
      { name: 'CORFORT', price: 2.99, quantity: 1 },
    ];
    assert.equal(
      itemsSumMatchesSubtotal({ items, subtotal: 62.54, tax: 2.53, total: 62.54 }),
      true
    );
    assert.equal(getTotalsMatchGist({ items, subtotal: 62.54, tax: 2.53, total: 62.54 }), 'Totals match');
  });
});
