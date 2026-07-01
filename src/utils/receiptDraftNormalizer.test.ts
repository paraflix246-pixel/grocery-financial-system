import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ParsedReceiptDraft } from '@/src/models/types';
import { parseReceiptText } from '@/src/services/receiptParser';
import { computeItemsSubtotal, computeReceiptTotals } from '@/src/utils/receiptTotals';

import {
  alignNamesToPrices,
  buildReceiptLineSource,
  finalizeReceiptDraft,
  HIDDEN_ITEM_NAME,
  inferFooterTripleFromItems,
  isFragmentedItemName,
  resolvePrintedTotals,
  restoreReadableNamesFromPrimary,
  stripFooterLineItems,
  trimItemsToSubtotalSum,
} from './receiptDraftNormalizer';
import { hasConsistentPrintedFooter } from './receiptItemLabels';

const CANADIAN_WALMART_SUBTOTAL = 62.54;
const CANADIAN_WALMART_TAX = 2.53;
const CANADIAN_WALMART_TOTAL = 62.54;

const CANADIAN_WALMART_OCR_TEXT = `Walmart
SPAGHETTI
$1.97 H
CARROTS 2LB
$2.44 H
CHICKEN DRUMSTICKS
$7.82 H
CHIPITS HERSHEY
$4.97 H
BEEF MEDALLION
$14.50 H
SQUASH BUTTERNUT
$3.15 H
RED ONIONS
$2.88 H
TOMATOES ON VINE
$4.20 H
CHARGE PYMT D68
QTY 1
$4.06 H
YEAST INSTANT
$6 75 H
MILK 4L
$5.29 H
MILK 4L
$5.29 H
BREAD WHEAT
$2.99 H
BREAD ONLY
$2.99 H
CARATOES WHEAT
$2.99 H
SH TOMRTH
$1.99 H
UMBERY DIS
$2.99 H
CORFORT
$2.99 H
SUBTOTAL
$62.54
HST (13%)
$2.53
TOTAL
$62.54`;

const CANADIAN_WALMART_MERCHANDISE = [
  { name: 'SPAGHETTI', price: 1.97 },
  { name: 'CARROTS 2LB', price: 2.44 },
  { name: 'CHICKEN DRUMSTICKS', price: 7.82 },
  { name: 'CHIPITS HERSHEY', price: 4.97 },
  { name: 'BEEF MEDALLION', price: 14.5 },
  { name: 'SQUASH BUTTERNUT', price: 3.15 },
  { name: 'RED ONIONS', price: 2.88 },
  { name: 'TOMATOES ON VINE', price: 4.2 },
  { name: 'YEAST INSTANT', price: 6.75 },
  { name: 'MILK 4L', price: 5.29 },
  { name: 'MILK 4L', price: 5.29 },
  { name: 'BREAD WHEAT', price: 2.99 },
] as const;

function assertCanadianWalmartReceipt(result: ParsedReceiptDraft): void {
  assert.equal(result.subtotal, CANADIAN_WALMART_SUBTOTAL);
  assert.equal(result.tax, CANADIAN_WALMART_TAX);
  assert.equal(result.total, CANADIAN_WALMART_TOTAL);
  assert.equal(result.items.length, 18);

  for (const expected of CANADIAN_WALMART_MERCHANDISE) {
    assert.ok(
      result.items.some((item) => item.name === expected.name && item.price === expected.price),
      `missing ${expected.name} @ ${expected.price}`
    );
  }

  const chargePymt = result.items.find((item) => /charge\s+pymt/i.test(item.name));
  assert.ok(chargePymt);
  assert.equal(chargePymt?.price, 4.06);
  assert.equal(chargePymt?.lineKind, 'fee');

  for (const junkName of ['BREAD ONLY', 'CARATOES WHEAT', 'SH TOMRTH', 'UMBERY DIS', 'CORFORT']) {
    const junk = result.items.find((item) => item.name === junkName);
    assert.ok(junk, `missing ${junkName}`);
    assert.equal(junk?.lineKind, 'other');
  }

  const merchSum = computeItemsSubtotal(
    result.items.filter((item) => (item.lineKind ?? 'merchandise') === 'merchandise')
  );
  assert.ok(Math.abs(merchSum - 62.25) <= 0.01);

  const relevantSum = computeItemsSubtotal(
    result.items.filter((item) => (item.lineKind ?? 'merchandise') !== 'other')
  );
  assert.ok(Math.abs(relevantSum - 66.31) <= 0.01);
  assert.ok(result.printedTaxRate === 13);
}

/** @deprecated use assertCanadianWalmartReceipt */
function assertCanadianWalmartMerchandise(result: ParsedReceiptDraft): void {
  assertCanadianWalmartReceipt(result);
}

const WALMART_SUBTOTAL = 518.85;
const WALMART_TAX = 42.77;
const WALMART_TOTAL = 561.62;

function walmartFooter(): Pick<ParsedReceiptDraft, 'subtotal' | 'tax' | 'total'> {
  return { subtotal: WALMART_SUBTOTAL, tax: WALMART_TAX, total: WALMART_TOTAL };
}

describe('resolvePrintedTotals', () => {
  it('reads Canadian HST footer when subtotal equals total', () => {
    const ocrText = `ITEM
$1.00 H
SUBTOTAL
$62.54
HST (13%)
$2.53
TOTAL
$62.54`;
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-20',
      subtotal: 60.01,
      tax: 2.53,
      total: 62.54,
      items: [{ name: 'ITEM', price: 1, quantity: 1 }],
    };

    const printed = resolvePrintedTotals(draft, ocrText, draft);
    assert.deepEqual(printed, { subtotal: 62.54, tax: 2.53, total: 62.54 });
  });
});

describe('stripFooterLineItems', () => {
  it('removes subtotal, tax, and total rows from items', () => {
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      ...walmartFooter(),
      items: [
        { name: 'MILK', price: 7.96, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: WALMART_SUBTOTAL, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: WALMART_TAX, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: WALMART_TOTAL, quantity: 1 },
      ],
    };

    const result = stripFooterLineItems(draft);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.name, 'MILK');
    assert.equal(result.items[0]?.price, 7.96);
  });

  it('removes footer labels even when prices are product amounts', () => {
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      ...walmartFooter(),
      items: [
        { name: 'PRODUCE', price: 56.44, quantity: 1 },
        { name: 'SUBTOTAL', price: 31.88, quantity: 1 },
        { name: 'TAX', price: 24.63, quantity: 1 },
        { name: 'TOTAL', price: 39.71, quantity: 1 },
        { name: 'BARCODE', price: 56.44, quantity: 1 },
      ],
    };

    const result = stripFooterLineItems(draft);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.name, 'PRODUCE');
  });
});

describe('trimItemsToSubtotalSum', () => {
  it('stops when running sum reaches printed subtotal', () => {
    const items = Array.from({ length: 25 }, (_, index) => ({
      name: `ITEM ${index + 1}`,
      price: 23.58,
      quantity: 1,
    }));

    const trimmed = trimItemsToSubtotalSum(items, WALMART_SUBTOTAL);
    const sum = computeItemsSubtotal(trimmed);

    assert.ok(trimmed.length < items.length);
    assert.ok(Math.abs(sum - WALMART_SUBTOTAL) <= 0.15);
  });

  it('does not remove every item when subtotal is smaller than the cheapest line', () => {
    const items = [
      { name: 'Eggs', price: 3.49, quantity: 1 },
      { name: 'Bread', price: 2.99, quantity: 1 },
      { name: 'Orange Juice', price: 4.29, quantity: 1 },
    ];

    const trimmed = trimItemsToSubtotalSum(items, 1.18);

    assert.equal(trimmed.length, 3);
  });
});

describe('alignNamesToPrices', () => {
  it('fills extra OCR prices with (name hidden)', () => {
    const aiItems = Array.from({ length: 18 }, (_, index) => ({
      name: `PRODUCT ${index + 1}`,
      price: 1,
      quantity: 1,
    }));
    const ocrItems = Array.from({ length: 20 }, (_, index) => ({
      name: index < 16 ? `OCR ${index + 1}` : HIDDEN_ITEM_NAME,
      price: 1,
      quantity: 1,
    }));
    const prices = Array.from({ length: 22 }, () => 23.58);

    const aligned = alignNamesToPrices(aiItems, ocrItems, prices);

    assert.equal(aligned.length, 22);
    assert.equal(aligned[18]?.name, HIDDEN_ITEM_NAME);
    assert.equal(aligned[21]?.name, HIDDEN_ITEM_NAME);
    assert.equal(aligned[0]?.price, 23.58);
  });

  it('matches AI names by price when row index differs', () => {
    const prices = [19.97, 16.42, 23.96];
    const aiItems = [
      { name: 'DOG FOOD', price: 19.97, quantity: 1 },
      { name: 'CAT FOOD', price: 16.42, quantity: 1 },
      { name: 'DIAPERS', price: 23.96, quantity: 1 },
    ];
    const ocrItems = prices.map(() => ({
      name: HIDDEN_ITEM_NAME,
      price: 0,
      quantity: 1,
    }));
    // AI list shifted by one row vs prices — index matching would pair wrong names.
    const shiftedAiItems = [
      { name: 'CAT FOOD', price: 16.42, quantity: 1 },
      { name: 'DIAPERS', price: 23.96, quantity: 1 },
      { name: 'DOG FOOD', price: 19.97, quantity: 1 },
    ];

    const aligned = alignNamesToPrices(shiftedAiItems, ocrItems, prices);

    assert.equal(aligned[0]?.name, 'DOG FOOD');
    assert.equal(aligned[0]?.price, 19.97);
    assert.equal(aligned[1]?.name, 'CAT FOOD');
    assert.equal(aligned[1]?.price, 16.42);
    assert.equal(aligned[2]?.name, 'DIAPERS');
    assert.equal(aligned[2]?.price, 23.96);
  });

  it('does not use AI names when OCR captured a fragment on that price slot', () => {
    const prices = [10.98, 16.42];
    const ocrItems = [
      { name: 'OWELS', price: 10.98, quantity: 1 },
      { name: 'PRODUCE', price: 16.42, quantity: 1 },
    ];
    const aiItems = [
      { name: 'PAPER TOWELS', price: 10.98, quantity: 1 },
      { name: 'PRODUCE', price: 16.42, quantity: 1 },
    ];

    const aligned = alignNamesToPrices(aiItems, ocrItems, prices);

    assert.equal(aligned[0]?.name, HIDDEN_ITEM_NAME);
    assert.equal(aligned[1]?.name, 'PRODUCE');
  });

  it('uses AI names when OCR had no text for a price slot', () => {
    const prices = [10.98];
    const ocrItems = [{ name: HIDDEN_ITEM_NAME, price: 10.98, quantity: 1 }];
    const aiItems = [{ name: 'PAPER TOWELS', price: 10.98, quantity: 1 }];

    const aligned = alignNamesToPrices(aiItems, ocrItems, prices);

    assert.equal(aligned[0]?.name, 'PAPER TOWELS');
  });

  it('uses readable names from flat OCR text lines', () => {
    const prices = [44.61, 7.36];
    const ocrItems = prices.map((price) => ({
      name: HIDDEN_ITEM_NAME,
      price,
      quantity: 1,
    }));
    const ocrText = 'RIBEYE STEAK PK 44.61\nMILK 2 GAL 7.36';

    const aligned = alignNamesToPrices([], ocrItems, prices, [], ocrText);

    assert.equal(aligned[0]?.name, 'RIBEYE STEAK PK');
    assert.equal(aligned[1]?.name, 'MILK 2 GAL');
  });

  it('pairs US Walmart price-before-name OCR lines correctly', () => {
    const ocrText = `44.61
RIBEYE STEAK PK
18.72
PORK CHOPS FAMILY PK
19.84
CHICKEN WINGS
24.92
SALNON FILLET
7.96
MILK 2 GAL
518.85
SUBTOTAL`;
    const prices = [44.61, 18.72, 19.84, 24.92, 7.96];
    const ocrItems = prices.map((price) => ({
      name: HIDDEN_ITEM_NAME,
      price,
      quantity: 1,
    }));

    const aligned = alignNamesToPrices([], ocrItems, prices, [], ocrText);

    assert.equal(aligned[0]?.name, 'RIBEYE STEAK PK');
    assert.equal(aligned[0]?.price, 44.61);
    assert.equal(aligned[1]?.name, 'PORK CHOPS FAMILY PK');
    assert.equal(aligned[1]?.price, 18.72);
    assert.equal(aligned[4]?.name, 'MILK 2 GAL');
    assert.equal(aligned[4]?.price, 7.96);
  });

  it('uses flat OCR text names when spatial rows are shifted by one', () => {
    const prices = [1.97, 2.44, 7.82];
    const ocrItems = [
      { name: 'A:T:MATCHAL', price: 1.97, quantity: 1 },
      { name: 'SPAGHETTI', price: 2.44, quantity: 1 },
      { name: 'CARROTS 2LB', price: 7.82, quantity: 1 },
    ];
    const aiItems = [
      { name: 'CARROTS 2LB', price: 2.44, quantity: 1 },
      { name: 'CHICKEN DRUMSTICKS', price: 7.82, quantity: 1 },
    ];
    const ocrText = `A:T:MATCHAL
SPAGHETTI
$1.97 H
CARROTS 2LB
$2.44 H
CHICKEN DRUMSTICKS
$7.82 H`;

    const aligned = alignNamesToPrices(aiItems, ocrItems, prices, aiItems, ocrText);

    assert.equal(aligned[0]?.name, 'SPAGHETTI');
    assert.equal(aligned[0]?.price, 1.97);
    assert.equal(aligned[1]?.name, 'CARROTS 2LB');
    assert.equal(aligned[1]?.price, 2.44);
    assert.equal(aligned[2]?.name, 'CHICKEN DRUMSTICKS');
    assert.equal(aligned[2]?.price, 7.82);
  });
});

const US_WALMART_OCR_TEXT = `Walmart
WALMART SUPERCENTER
STORE #3885
06/08/26 7:02 PM
as
TC8 9194 8821 3375 2048
44.61
RIBEYE STEAK PK
18.72
PORK CHOPS FAMILY PK
19.84
CHICKEN WINGS
24.92
SALNON FILLET
7.96
MILK 2 GAL
5.92
EGGS 18CT
3
14.46
CEREA
10.98
GAT
10.98
13.98
6.48
19.97
.OWELS
23.96
2T PAPER
12.88
ASH BAGS
8.24
ISH SOAP
33.98
DOG FOOD
16.42
CAT FOOD
42.97
DIAPERS
31.88
FROZEN FOOD
24.63
SNACKS
39.71
PRODUCE
56.44
CLEANING ITEMS
518.85
SUBTOTAL
TAX
42.77
TOTAL
561.62`;

describe('finalizeReceiptDraft US Walmart 22-item', () => {
  it('aligns price-before-name OCR rows without shifting names', () => {
    const textDraft = parseReceiptText(US_WALMART_OCR_TEXT);
    const result = finalizeReceiptDraft(textDraft, US_WALMART_OCR_TEXT, textDraft);

    assert.equal(result.subtotal, WALMART_SUBTOTAL);
    assert.equal(result.tax, WALMART_TAX);
    assert.equal(result.total, WALMART_TOTAL);
    assert.equal(result.items.length, 22);

    assert.equal(result.items[0]?.name, 'RIBEYE STEAK PK');
    assert.equal(result.items[0]?.price, 44.61);
    assert.equal(result.items[1]?.name, 'PORK CHOPS FAMILY PK');
    assert.equal(result.items[1]?.price, 18.72);
    assert.equal(result.items[2]?.name, 'CHICKEN WINGS');
    assert.equal(result.items[2]?.price, 19.84);
    assert.equal(result.items[3]?.name, 'SALNON FILLET');
    assert.equal(result.items[3]?.price, 24.92);
    assert.equal(result.items[4]?.name, 'MILK 2 GAL');
    assert.equal(result.items[4]?.price, 7.96);
    assert.equal(result.items[5]?.name, 'EGGS 18CT');
    assert.equal(result.items[5]?.price, 5.92);

    assert.equal(result.items[15]?.name, 'DOG FOOD');
    assert.equal(result.items[15]?.price, 33.98);
    assert.equal(result.items[16]?.name, 'CAT FOOD');
    assert.equal(result.items[16]?.price, 16.42);
    assert.equal(result.items[21]?.name, 'CLEANING ITEMS');
    assert.equal(result.items[21]?.price, 56.44);

    const hidden = result.items.filter((item) => item.name === HIDDEN_ITEM_NAME);
    assert.ok(hidden.length >= 3);
    assert.ok(hidden.some((item) => item.price === 13.98));
    assert.ok(hidden.some((item) => item.price === 6.48));
    assert.ok(result.items.every((item) => item.name !== 'TC8 9194 8821 3375 2048'));
  });

  it('realigns shifted ChatGPT vision names using OCR price-before-name text', () => {
    const ocrDraft = parseReceiptText(US_WALMART_OCR_TEXT);
    const shiftedAiItems = ocrDraft.items.map((item, index) => ({
      ...item,
      name: ocrDraft.items[Math.max(0, index - 1)]?.name ?? item.name,
    }));
    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      ...walmartFooter(),
      items: shiftedAiItems,
    };

    const result = finalizeReceiptDraft(aiDraft, US_WALMART_OCR_TEXT, ocrDraft);

    assert.equal(result.items.length, 22);
    assert.equal(result.items[0]?.name, 'RIBEYE STEAK PK');
    assert.equal(result.items[0]?.price, 44.61);
    assert.equal(result.items[1]?.name, 'PORK CHOPS FAMILY PK');
    assert.equal(result.items[1]?.price, 18.72);
    assert.equal(result.items[2]?.name, 'CHICKEN WINGS');
    assert.equal(result.items[2]?.price, 19.84);
    assert.equal(result.items[4]?.name, 'MILK 2 GAL');
    assert.equal(result.items[4]?.price, 7.96);
    assert.equal(result.subtotal, WALMART_SUBTOTAL);
    assert.equal(result.total, WALMART_TOTAL);
  });

  it('strips phantom header junk row and keeps 22-item alignment', () => {
    const junkOcrText = US_WALMART_OCR_TEXT.replace(
      'TC8 9194 8821 3375 2048',
      'T0R 885 06/0/6//2 P0 885.06'
    );
    const ocrDraft = parseReceiptText(junkOcrText);
    const shiftedAiItems = ocrDraft.items.map((item, index) => ({
      ...item,
      name: ocrDraft.items[Math.max(0, index - 1)]?.name ?? item.name,
    }));
    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      ...walmartFooter(),
      items: shiftedAiItems,
    };

    const result = finalizeReceiptDraft(aiDraft, junkOcrText, ocrDraft);

    assert.equal(result.items.length, 22);
    assert.equal(result.items.some((item) => item.price === 885.06), false);
    assert.equal(result.items[0]?.name, 'RIBEYE STEAK PK');
    assert.equal(result.items[0]?.price, 44.61);
    assert.equal(result.items[1]?.name, 'PORK CHOPS FAMILY PK');
    assert.equal(result.items[1]?.price, 18.72);
    assert.equal(result.items[4]?.name, 'MILK 2 GAL');
    assert.equal(result.items[4]?.price, 7.96);
    assert.equal(result.subtotal, WALMART_SUBTOTAL);
    assert.equal(result.total, WALMART_TOTAL);
  });

  it('flags garbled vision fragment names as hidden', () => {
    const garbled = [
      'GATE',
      'GATES',
      'GAS',
      'SUNNES',
      'BEST PAPER',
      'BASH BAGS',
      'BISH SOAP',
      'GAT',
      'OWELS',
      'ASH BAGS',
      'ISH SOAP',
      'CEREA',
      '3',
    ];
    for (const name of garbled) {
      assert.equal(isFragmentedItemName(name), true, `expected fragment: ${name}`);
    }
    assert.equal(isFragmentedItemName('CHICKEN WINGS'), false);
    assert.equal(isFragmentedItemName('CHICKEN WINDS'), false);
    assert.equal(isFragmentedItemName('DOG FOOD'), false);
  });

  it('realigns garbled 20-item vision draft with total-as-subtotal footer', () => {
    const ocrDraft = parseReceiptText(US_WALMART_OCR_TEXT);
    const garbledVisionNames = [
      'RIBEYE STEAK PK',
      'CHICKEN WINDS',
      'PORK CHOPS FAMILY PK',
      'SALNON FILLET',
      'MILK 2 GAL',
      'EGGS 18CT',
      '3',
      'CEREA',
      'GATE',
      'GATES',
      'GAS',
      'SUNNES',
      'BEST PAPER',
      'BASH BAGS',
      'BISH SOAP',
      'DOG FOOD',
      'CAT FOOD',
      'DIAPERS',
      'FROZEN FOOD',
      'SNACKS',
    ];
    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      subtotal: WALMART_TOTAL,
      tax: WALMART_TAX,
      total: WALMART_TOTAL,
      items: ocrDraft.items.slice(0, 20).map((item, index) => ({
        ...item,
        name: garbledVisionNames[index] ?? item.name,
      })),
    };

    const result = finalizeReceiptDraft(aiDraft, US_WALMART_OCR_TEXT, ocrDraft);

    assert.equal(result.items.length, 22);
    assert.equal(result.subtotal, WALMART_SUBTOTAL);
    assert.equal(result.tax, WALMART_TAX);
    assert.equal(result.total, WALMART_TOTAL);
    assert.equal(result.items[0]?.name, 'RIBEYE STEAK PK');
    assert.equal(result.items[2]?.name, 'CHICKEN WINGS');
    assert.equal(result.items[2]?.price, 19.84);

    const badNames = ['GATE', 'GATES', 'GAS', 'SUNNES', 'BEST PAPER', 'BASH BAGS', 'BISH SOAP'];
    for (const bad of badNames) {
      assert.ok(!result.items.some((item) => item.name === bad), `should not keep ${bad}`);
    }

    const hidden = result.items.filter((item) => item.name === HIDDEN_ITEM_NAME);
    assert.ok(hidden.length >= 3);
  });

  it('prefers OCR CHICKEN WINGS over vision CHICKEN WINDS at the same price', () => {
    const prices = [19.84];
    const ocrItems = [{ name: 'CHICKEN WINGS', price: 19.84, quantity: 1 }];
    const aiItems = [{ name: 'CHICKEN WINDS', price: 19.84, quantity: 1 }];

    const aligned = alignNamesToPrices(aiItems, ocrItems, prices);

    assert.equal(aligned[0]?.name, 'CHICKEN WINGS');
  });

  it('resolvePrintedTotals reads subtotal from OCR when AI sets subtotal to total', () => {
    const ocrDraft = parseReceiptText(US_WALMART_OCR_TEXT);
    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      subtotal: WALMART_TOTAL,
      tax: WALMART_TAX,
      total: WALMART_TOTAL,
      items: ocrDraft.items.slice(0, 20),
    };

    const printed = resolvePrintedTotals(aiDraft, US_WALMART_OCR_TEXT, ocrDraft);
    assert.deepEqual(printed, {
      subtotal: WALMART_SUBTOTAL,
      tax: WALMART_TAX,
      total: WALMART_TOTAL,
    });
  });

  it('computeReceiptTotals infers pre-tax subtotal when AI sets subtotal equal to total', () => {
    const ocrDraft = parseReceiptText(US_WALMART_OCR_TEXT);
    const items = ocrDraft.items.slice(0, 20);
    const totals = computeReceiptTotals({
      items,
      subtotal: WALMART_TOTAL,
      tax: WALMART_TAX,
      total: WALMART_TOTAL,
    });

    assert.equal(totals.subtotal, WALMART_SUBTOTAL);
    assert.equal(totals.tax, WALMART_TAX);
    assert.equal(totals.total, WALMART_TOTAL);
  });
});

describe('inferFooterTripleFromItems', () => {
  it('detects subtotal/tax/total smuggled into items', () => {
    const triple = inferFooterTripleFromItems([
      { name: 'MILK', price: 7.96, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: WALMART_SUBTOTAL, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: WALMART_TAX, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: WALMART_TOTAL, quantity: 1 },
    ]);

    assert.deepEqual(triple, {
      subtotal: WALMART_SUBTOTAL,
      tax: WALMART_TAX,
      total: WALMART_TOTAL,
    });
  });

  it('does not infer tax from consecutive subtotal and total rows without a tax line', () => {
    const triple = inferFooterTripleFromItems([
      { name: 'Eggs', price: 3.49, quantity: 1 },
      { name: 'Bread', price: 2.99, quantity: 1 },
      { name: 'Orange Juice', price: 4.29, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: 14.77, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: 15.95, quantity: 1 },
    ]);

    assert.equal(triple, null);
  });
});

describe('restoreReadableNamesFromPrimary', () => {
  it('restores clean OpenAI names but keeps fragments as hidden', () => {
    const primary: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      total: 561.62,
      items: [
        { name: 'MILK 2 GAL', price: 7.36, quantity: 1 },
        // Fragment names — should NOT be restored
        { name: 'CEREA!', price: 14.46, quantity: 1 },
        { name: 'OWELS', price: 10.98, quantity: 1 },
      ],
    };
    const audited: ParsedReceiptDraft = {
      ...primary,
      items: [
        { name: 'MILK 2 GAL', price: 7.36, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: 14.46, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: 10.98, quantity: 1 },
      ],
    };

    const restored = restoreReadableNamesFromPrimary(audited, primary);
    // MILK is readable — should be preserved as-is (already was)
    assert.equal(restored.items[0]?.name, 'MILK 2 GAL');
    // Fragments must stay as (name hidden) — do not restore them
    assert.equal(restored.items[1]?.name, HIDDEN_ITEM_NAME);
    assert.equal(restored.items[2]?.name, HIDDEN_ITEM_NAME);
  });

  it('restores full readable names from OpenAI when DeepSeek hides them', () => {
    const primary: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      total: 561.62,
      items: [
        { name: 'PAPER TOWELS', price: 10.98, quantity: 1 },
        { name: 'DISH SOAP', price: 19.97, quantity: 1 },
      ],
    };
    const audited: ParsedReceiptDraft = {
      ...primary,
      items: [
        { name: HIDDEN_ITEM_NAME, price: 10.98, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: 19.97, quantity: 1 },
      ],
    };

    const restored = restoreReadableNamesFromPrimary(audited, primary);
    assert.equal(restored.items[0]?.name, 'PAPER TOWELS');
    assert.equal(restored.items[1]?.name, 'DISH SOAP');
  });
});

describe('finalizeReceiptDraft', () => {
  it('cleans polluted drafts even when footer fields are missing', () => {
    const pollutedItems = [
      { name: 'RIBEYE STEAK PK', price: 44.61, quantity: 1 },
      { name: 'MILK 2 GAL', price: 7.36, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: 24.63, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: 39.71, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: 56.44, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: WALMART_SUBTOTAL, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: WALMART_TAX, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: WALMART_TOTAL, quantity: 1 },
    ];
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      total: computeItemsSubtotal(pollutedItems),
      items: pollutedItems,
    };

    const result = finalizeReceiptDraft(draft, '', null);
    const sum = computeItemsSubtotal(result.items);

    assert.equal(result.total, WALMART_TOTAL);
    assert.equal(result.subtotal, WALMART_SUBTOTAL);
    assert.equal(result.tax, WALMART_TAX);
    assert.ok(result.items.every((item) => item.price !== WALMART_SUBTOTAL));
    assert.ok(result.items.every((item) => item.price !== WALMART_TAX));
    assert.ok(result.items.every((item) => item.price !== WALMART_TOTAL));
    assert.ok(sum <= WALMART_SUBTOTAL + 0.15);
  });

  it('fixes AI date using OCR header text', () => {
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2008-06-26',
      ...walmartFooter(),
      items: [{ name: 'MILK', price: 7.96, quantity: 1 }],
    };
    const ocrText = 'Walmart Supercenter\n06/08/26\nMILK 7.96\nSUBTOTAL 518.85';

    const result = finalizeReceiptDraft(draft, ocrText, null);

    assert.equal(result.date, '2026-06-08');
  });

  it('reads footer totals when OCR emits value lines before labels', () => {
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      subtotal: 1570.3,
      tax: 0,
      total: 1570.3,
      items: [
        { name: 'RIBEYE STEAK PK', price: 44.61, quantity: 1 },
        { name: 'PORK CHOPS FAMILY PK', price: 18.72, quantity: 1 },
        { name: 'CHICKEN WINGS', price: 19.84, quantity: 1 },
      ],
    };
    const ocrText =
      'WALMART SUPERCENTER\n06/08/26\n44.61\nRIBEYE STEAK PK\n518.85\nSUBTOTAL\n42.77\nTAX\n561.62\nTOTAL';

    const result = finalizeReceiptDraft(draft, ocrText, null);

    assert.equal(result.subtotal, 518.85);
    assert.equal(result.tax, 42.77);
    assert.equal(result.total, 561.62);
  });

  it('keeps AI row prices when they already match the printed subtotal', () => {
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      subtotal: 26.68,
      tax: 0,
      total: 26.68,
      items: [
        { name: 'PORK CHOPS FAMILY PK', price: 18.72, quantity: 1 },
        { name: 'MILK 2 GAL', price: 7.96, quantity: 1 },
      ],
    };
    const ocrDraft: ParsedReceiptDraft = {
      ...draft,
      items: [
        { name: 'PORK CHOPS FAMILY PK', price: 18.12, quantity: 1 },
        { name: 'MILK 2 GAL', price: 7.36, quantity: 1 },
      ],
    };
    const ocrText = 'PORK CHOPS FAMILY PK 18.12\nMILK 2 GAL 7.36\nSUBTOTAL 26.68';

    const result = finalizeReceiptDraft(draft, ocrText, ocrDraft);

    assert.equal(result.items[0]?.price, 18.72);
    assert.equal(result.items[1]?.price, 7.96);
  });

  it('strips footer rows and trims overflow for polluted AI drafts', () => {
    const productItems = Array.from({ length: 22 }, (_, index) => ({
      name: `ITEM ${index + 1}`,
      price: 23.58,
      quantity: 1,
    }));
    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-08',
      ...walmartFooter(),
      items: [
        ...productItems,
        { name: HIDDEN_ITEM_NAME, price: WALMART_SUBTOTAL, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: WALMART_TAX, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: WALMART_TOTAL, quantity: 1 },
      ],
    };

    const result = finalizeReceiptDraft(draft, '', null);
    const sum = computeItemsSubtotal(result.items);

    assert.ok(result.items.every((item) => item.price !== WALMART_SUBTOTAL));
    assert.ok(result.items.every((item) => item.price !== WALMART_TAX));
    assert.ok(result.items.every((item) => item.price !== WALMART_TOTAL));
    assert.ok(Math.abs(sum - WALMART_SUBTOTAL) <= 0.15);
  });

  it('fixes 3-item Walmart receipt with split footer lines and phantom rows', () => {
    const ocrText = `Walmart
Walmart
Walmart
Phoenix, AZ
23/03/2026 4:03 PM
Eggs.
Bread
......$2.99
Orange Juice .
$4.29
SUBTOTAL ........ $14.77
TAX
TOTAL
$15.95
Walmart`;

    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-03-23',
      subtotal: 41.49,
      tax: 0,
      total: 41.49,
      items: [
        { name: 'Eggs', price: 3.49, quantity: 1 },
        { name: 'Bread', price: 2.99, quantity: 1 },
        { name: 'Orange Juice', price: 4.29, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: 14.77, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: 15.95, quantity: 1 },
      ],
    };

    const ocrDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-03-23',
      subtotal: 14.77,
      tax: 0,
      total: 14.77,
      items: [
        { name: '......', price: 2.99, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: 4.29, quantity: 1 },
      ],
    };

    const result = finalizeReceiptDraft(aiDraft, ocrText, ocrDraft);

    assert.equal(result.items.length, 3);
    assert.equal(result.subtotal, 14.77);
    assert.equal(result.tax, 1.18);
    assert.equal(result.total, 15.95);
    assert.ok(result.items.every((item) => item.name !== HIDDEN_ITEM_NAME));
    assert.ok(result.items.every((item) => item.price !== 14.77));
    assert.ok(result.items.every((item) => item.price !== 15.95));

    const byName = Object.fromEntries(result.items.map((item) => [item.name, item.price]));
    assert.equal(byName['Eggs'], 3.49);
    assert.equal(byName['Bread'], 2.99);
    assert.equal(byName['Orange Juice'], 4.29);
  });

  it('infers tax from subtotal and total when OCR missed the tax amount', () => {
    const ocrText = 'ITEM 1.00\nSUBTOTAL 10.00\nTAX\nTOTAL\n11.50';
    const draft: ParsedReceiptDraft = {
      storeName: 'Store',
      date: '2026-03-23',
      subtotal: 10,
      tax: 0,
      total: 10,
      items: [{ name: 'ITEM', price: 1, quantity: 1 }],
    };

    const result = finalizeReceiptDraft(draft, ocrText, draft);

    assert.equal(result.subtotal, 10);
    assert.equal(result.tax, 1.5);
    assert.equal(result.total, 11.5);
  });

  it('does not wipe all items when AI confuses tax amount with subtotal/total', () => {
    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-03-23',
      subtotal: 1.18,
      tax: 0,
      total: 1.18,
      items: [
        { name: 'Eggs', price: 3.49, quantity: 1 },
        { name: 'Bread', price: 2.99, quantity: 1 },
        { name: 'Orange Juice', price: 4.29, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: 14.77, quantity: 1 },
        { name: HIDDEN_ITEM_NAME, price: 15.95, quantity: 1 },
      ],
    };

    const result = finalizeReceiptDraft(aiDraft, '', null);

    assert.equal(result.items.length, 3);
    assert.equal(result.subtotal, 14.77);
    assert.equal(result.tax, 0);
    assert.equal(result.total, 15.95);
    assert.ok(result.items.every((item) => item.name !== HIDDEN_ITEM_NAME));
    assert.ok(result.items.every((item) => item.price !== 14.77));
    assert.ok(result.items.every((item) => item.price !== 15.95));

    const byName = Object.fromEntries(result.items.map((item) => [item.name, item.price]));
    assert.equal(byName['Eggs'], 3.49);
    assert.equal(byName['Bread'], 2.99);
    assert.equal(byName['Orange Juice'], 4.29);
  });

  it('recovers totals from OCR footer when items kept but AI footer fields are tax-only', () => {
    const ocrText = `SUBTOTAL ........ $14.77
TAX
TOTAL
$15.95`;
    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-03-23',
      subtotal: 1.18,
      tax: 0,
      total: 1.18,
      items: [
        { name: 'Eggs', price: 3.49, quantity: 1 },
        { name: 'Bread', price: 2.99, quantity: 1 },
        { name: 'Orange Juice', price: 4.29, quantity: 1 },
      ],
    };

    const printed = resolvePrintedTotals(aiDraft, ocrText, null);
    assert.deepEqual(printed, { subtotal: 14.77, tax: 1.18, total: 15.95 });

    const result = finalizeReceiptDraft(aiDraft, ocrText, null);
    assert.equal(result.items.length, 3);
    assert.equal(result.subtotal, 14.77);
    assert.equal(result.tax, 1.18);
    assert.equal(result.total, 15.95);
  });

  it('recovers totals from OCR draft when phantom footer rows were already stripped', () => {
    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-03-23',
      subtotal: 1.18,
      tax: 0,
      total: 1.18,
      items: [
        { name: 'Eggs', price: 3.49, quantity: 1 },
        { name: 'Bread', price: 2.99, quantity: 1 },
        { name: 'Orange Juice', price: 4.29, quantity: 1 },
      ],
    };
    const ocrDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-03-23',
      subtotal: 14.77,
      tax: 0,
      total: 15.95,
      items: [],
    };

    const ocrText = `SUBTOTAL 14.77
TAX
TOTAL 15.95`;
    const result = finalizeReceiptDraft(aiDraft, ocrText, ocrDraft);
    assert.equal(result.items.length, 3);
    assert.equal(result.subtotal, 14.77);
    assert.equal(result.tax, 1.18);
    assert.equal(result.total, 15.95);
  });

  it('keeps Canadian Walmart line items with HST-inclusive footer', () => {
    const ocrText = `Walmart
STORE 3156
SPAGHETTI
$1.97 H
CARROTS 2LB
$2.44 H
CHICKEN DRUMSTICKS
$7.82 H
TOMATOES ON VINE
$4.20 H
CHARGE PYMT D68
QTY 1
$4.06 H
YEAST INSTANT
$6 75 H
MILK 4L
$5.29 H
SUBTOTAL
$62.54
HST (13%)
$2.53
TOTAL
$62.54`;

    const ocrDraft = parseReceiptText(ocrText);
    const result = finalizeReceiptDraft(ocrDraft, ocrText, ocrDraft);

    assert.equal(result.storeName, 'Walmart');
    assert.ok(result.items.some((item) => item.name === 'TOMATOES ON VINE' && item.price === 4.2));
    assert.ok(result.items.some((item) => /charge\s+pymt/i.test(item.name) && item.lineKind === 'fee'));
    assert.ok(result.items.every((item) => item.name !== HIDDEN_ITEM_NAME));
    assert.equal(result.items.length, 7);
  });

  it('filters payment fees and promo junk on Canadian HST Walmart receipt', () => {
    const ocrDraft = parseReceiptText(CANADIAN_WALMART_OCR_TEXT);
    const result = finalizeReceiptDraft(ocrDraft, CANADIAN_WALMART_OCR_TEXT, ocrDraft);
    assertCanadianWalmartReceipt(result);
  });

  it('keeps merchandise when AI draft is short on Canadian HST receipt', () => {
    const ocrDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2023-10-05',
      subtotal: CANADIAN_WALMART_SUBTOTAL,
      tax: CANADIAN_WALMART_TAX,
      total: CANADIAN_WALMART_TOTAL,
      items: parseReceiptText(CANADIAN_WALMART_OCR_TEXT).items,
    };

    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2023-10-05',
      subtotal: CANADIAN_WALMART_SUBTOTAL,
      tax: CANADIAN_WALMART_TAX,
      total: CANADIAN_WALMART_TOTAL,
      items: [
        { name: 'SPAGHETTI', price: 1.97, quantity: 1 },
        { name: 'CARROTS 2LB', price: 2.44, quantity: 1 },
        { name: 'CHICKEN DRUMSTICKS', price: 7.82, quantity: 1 },
        { name: 'CHIPITS HERSHEY', price: 4.97, quantity: 1 },
        { name: 'BEEF MEDALLION', price: 14.5, quantity: 1 },
        { name: 'SQUASH BUTTERNUT', price: 3.15, quantity: 1 },
        { name: 'RED ONIONS', price: 2.88, quantity: 1 },
        { name: 'CHARGE PYMT D68', price: 4.06, quantity: 1 },
        { name: 'MILK 4L', price: 5.29, quantity: 1 },
        { name: 'MILK 4L', price: 5.29, quantity: 1 },
        { name: 'BREAD WHEAT', price: 2.99, quantity: 1 },
        { name: 'BREAD ONLY', price: 2.99, quantity: 1 },
      ],
    };

    const result = finalizeReceiptDraft(aiDraft, CANADIAN_WALMART_OCR_TEXT, ocrDraft);

    assertCanadianWalmartReceipt(result);
    assert.ok(hasConsistentPrintedFooter(result));
  });

  it('aligns Waterloo Walmart rows when spatial OCR shifts names by one', () => {
    const ocrText = `Walmart
A:T:MATCHAL
SPAGHETTI
$1.97 H
CARROTS 2LB
$2.44 H
CHICKEN DRUMSTICKS
$7.82 H
CHIPITS HERSHEY
$4.97 H
BEEF MEDALLION
$14.50 H
SQUASH BUTTERNUT
$3.15 H
RED ONIONS
$2.88 H
TOMATOES ON VINE
$4.20 H
CHARGE PYMT D68
QTY 1
$4.06 H
YEAST INSTANT
$6 75 H
MILK 4L
$5.29 H
MILK 4L
$5.29 H
BREAD WHEAT
$2.99 H
BREAD ONLY
$2.99 H
CARATOES WHEAT
$2.99 H
SH TOMRTH
$1.99 H
UMBERY DIS
$2.99 H
CORFORT
$2.99 H
SUBTOTAL
$62.54
HST (13%)
$2.53
TOTAL
$62.54`;

    const textItems = parseReceiptText(ocrText).items;
    const spatialItems = [
      { name: 'A:T:MATCHAL', price: 1.97, quantity: 1 },
      { name: 'SPAGHETTI', price: 2.44, quantity: 1 },
      { name: 'CARROTS 2LB', price: 7.82, quantity: 1 },
      { name: 'CHICKEN DRUMSTICKS', price: 4.97, quantity: 1 },
      { name: 'CHIPITS HERSHEY', price: 14.5, quantity: 1 },
      { name: 'BEEF MEDALLION', price: 3.15, quantity: 1 },
      { name: 'SQUASH BUTTERNUT', price: 2.88, quantity: 1 },
      { name: 'CHARGE PYMT D68 QTY 1', price: 4.06, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: 6.75, quantity: 1 },
      { name: 'YEAST INSTANT', price: 5.29, quantity: 1 },
      { name: 'MILK 4L', price: 5.29, quantity: 1 },
      { name: 'MILK 4L', price: 2.99, quantity: 1 },
      { name: 'BREAD ONLY', price: 2.99, quantity: 1 },
      { name: 'CARATOES WHEAT', price: 2.99, quantity: 1 },
      { name: HIDDEN_ITEM_NAME, price: 1.99, quantity: 1 },
      { name: 'SH TOMRTH', price: 2.99, quantity: 1 },
      { name: 'UMBERY DIS', price: 2.99, quantity: 1 },
      { name: 'CORFORT', price: 2.99, quantity: 1 },
    ];

    const ocrDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2023-10-05',
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      items: textItems,
    };

    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2023-10-05',
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      items: [
        { name: 'CARROTS 2LB', price: 2.44, quantity: 1 },
        { name: 'CHICKEN DRUMSTICKS', price: 7.82, quantity: 1 },
        { name: 'CHIPITS HERSHEY', price: 4.97, quantity: 1 },
        { name: 'BEEF MEDALLION', price: 14.5, quantity: 1 },
        { name: 'SQUASH BUTTERNUT', price: 3.15, quantity: 1 },
        { name: 'RED ONIONS', price: 2.88, quantity: 1 },
        { name: 'TOMATOES ON VINE', price: 4.06, quantity: 1 },
        { name: 'YEAST INSTANT', price: 6.75, quantity: 1 },
        { name: 'MILK 4L', price: 5.29, quantity: 1 },
        { name: 'MILK 4L', price: 5.29, quantity: 1 },
        { name: 'BREAD WHEAT', price: 2.99, quantity: 1 },
        { name: 'BREAD ONLY', price: 2.99, quantity: 1 },
      ],
    };

    const result = finalizeReceiptDraft(aiDraft, ocrText, {
      ...ocrDraft,
      items: spatialItems,
    });

    assertCanadianWalmartReceipt(result);
    assert.equal(result.items[0]?.name, 'SPAGHETTI');
    assert.equal(result.items[0]?.price, 1.97);
    assert.ok(result.items.every((item) => item.name !== 'A:T:MATCHAL'));
  });

  it('merges OCR tail when ChatGPT returns 12 items and ocrDraft rows are short', () => {
    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-20',
      subtotal: CANADIAN_WALMART_SUBTOTAL,
      tax: CANADIAN_WALMART_TAX,
      total: CANADIAN_WALMART_TOTAL,
      items: [
        { name: 'SPAGHETTI', price: 1.97, quantity: 1 },
        { name: 'CARROTS 2LB', price: 2.44, quantity: 1 },
        { name: 'CHICKEN DRUMSTICKS', price: 7.82, quantity: 1 },
        { name: 'CHIPITS HERSHEY', price: 4.97, quantity: 1 },
        { name: 'BEEF MEDALLION', price: 14.5, quantity: 1 },
        { name: 'SQUASH BUTTERNUT', price: 3.15, quantity: 1 },
        { name: 'RED ONIONS', price: 2.88, quantity: 1 },
        { name: 'CHARGE PYMT D68 QTY 1', price: 4.06, quantity: 1 },
        { name: 'MILK 4L', price: 5.29, quantity: 1 },
        { name: 'MILK 4L', price: 5.29, quantity: 1 },
        { name: 'BREAD WHEAT', price: 2.99, quantity: 1 },
        { name: 'BREAD ONLY', price: 2.99, quantity: 1 },
      ],
    };

    const shortOcrDraft: ParsedReceiptDraft = {
      ...aiDraft,
      items: aiDraft.items,
    };

    const result = finalizeReceiptDraft(aiDraft, CANADIAN_WALMART_OCR_TEXT, shortOcrDraft);

    assert.ok(result.items.some((item) => item.name === 'TOMATOES ON VINE' && item.price === 4.2));
    assert.ok(result.items.some((item) => item.name === 'YEAST INSTANT' && item.price === 6.75));
    assert.ok(result.items.some((item) => /charge\s+pymt/i.test(item.name) && item.lineKind === 'fee'));
    assert.ok(result.items.some((item) => item.name === 'BREAD ONLY' && item.lineKind === 'other'));
  });

  it('merges OCR tail when ChatGPT returns 12 items and ocrDraft is missing', () => {
    const aiDraft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-06-20',
      subtotal: CANADIAN_WALMART_SUBTOTAL,
      tax: CANADIAN_WALMART_TAX,
      total: CANADIAN_WALMART_TOTAL,
      items: [
        { name: 'SPAGHETTI', price: 1.97, quantity: 1 },
        { name: 'CARROTS 2LB', price: 2.44, quantity: 1 },
        { name: 'CHICKEN DRUMSTICKS', price: 7.82, quantity: 1 },
        { name: 'CHIPITS HERSHEY', price: 4.97, quantity: 1 },
        { name: 'BEEF MEDALLION', price: 14.5, quantity: 1 },
        { name: 'SQUASH BUTTERNUT', price: 3.15, quantity: 1 },
        { name: 'RED ONIONS', price: 2.88, quantity: 1 },
        { name: 'TOMATOES ON VINE', price: 4.2, quantity: 1 },
        { name: 'CHARGE PYMT D68 QTY 1', price: 4.06, quantity: 1, lineKind: 'fee' },
        { name: 'MILK 4L', price: 5.29, quantity: 1 },
        { name: 'MILK 4L', price: 5.29, quantity: 1 },
        { name: 'BREAD WHEAT', price: 2.99, quantity: 1 },
      ],
    };

    const truncatedOcr = CANADIAN_WALMART_OCR_TEXT.split('CHARGE PYMT')[0] + `SUBTOTAL
$62.54
HST (13%)
$2.53
TOTAL
$62.54`;
    const shortOcrDraft = parseReceiptText(truncatedOcr);

    const result = finalizeReceiptDraft(aiDraft, truncatedOcr, shortOcrDraft);

    assert.ok(result.items.some((item) => /charge\s+pymt/i.test(item.name) && item.lineKind === 'fee'));
    assert.ok(result.items.some((item) => item.name === 'TOMATOES ON VINE' && item.price === 4.2));
  });

  it('buildReceiptLineSource keeps fee/other from vision extraction when OCR draft is short', () => {
    const truncatedOcr = CANADIAN_WALMART_OCR_TEXT.split('CHARGE PYMT')[0] + `SUBTOTAL
$62.54
HST (13%)
$2.53
TOTAL
$62.54`;
    const shortOcrDraft = parseReceiptText(truncatedOcr);
    const extractionItems = [
      ...CANADIAN_WALMART_MERCHANDISE.map((item) => ({ ...item, quantity: 1 })),
      { name: 'CHARGE PYMT D68 QTY 1', price: 4.06, quantity: 1, lineKind: 'fee' as const },
      { name: 'BREAD ONLY', price: 2.99, quantity: 1, lineKind: 'other' as const },
    ];

    const merged = buildReceiptLineSource(shortOcrDraft, truncatedOcr, extractionItems);

    assert.ok(merged.some((item) => /charge\s+pymt/i.test(item.name) && item.lineKind === 'fee'));
    assert.ok(merged.some((item) => item.name === 'BREAD ONLY' && item.lineKind === 'other'));
    assert.equal(merged.length, shortOcrDraft.items.length + 2);
  });
});

describe('finalizeReceiptDraft store location', () => {
  it('extracts US address without adding address lines to items', () => {
    const ocrText = `TARGET
2700 ELDRIDGE PKWY
HOUSTON, TX 77082
MILK 1GAL 3.99
SUBTOTAL 3.99
TAX 0.33
TOTAL 4.32`;

    const draft: ParsedReceiptDraft = {
      storeName: 'Target',
      date: '2026-01-15',
      subtotal: 3.99,
      tax: 0.33,
      total: 4.32,
      items: [{ name: 'MILK 1GAL', price: 3.99, quantity: 1 }],
    };

    const result = finalizeReceiptDraft(draft, ocrText, draft);

    assert.equal(result.storeRegion, 'TX');
    assert.equal(result.storeCountry, 'US');
    assert.match(result.storeAddress ?? '', /ELDRIDGE/i);
    assert.ok(!result.items.some((item) => /eldridge|77082|houston/i.test(item.name)));
  });

  it('extracts Canadian Walmart Waterloo address with CA country', () => {
    const ocrText = `WALMART
335 Farmers Market Road
Waterloo, ON N2V 0A4
STORE 3156
MILK 1GAL 3.99
SUBTOTAL 3.99
HST (13%)
$0.52
TOTAL 3.99`;

    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2026-01-15',
      subtotal: 3.99,
      tax: 0.52,
      total: 3.99,
      items: [{ name: 'MILK 1GAL', price: 3.99, quantity: 1 }],
    };

    const result = finalizeReceiptDraft(draft, ocrText, draft);

    assert.equal(result.storeCity, 'Waterloo');
    assert.equal(result.storeRegion, 'ON');
    assert.equal(result.storePostalCode, 'N2V 0A4');
    assert.equal(result.storeCountry, 'CA');
    assert.match(result.storeAddress ?? '', /Farmers Market/i);
    assert.ok(!result.items.some((item) => /waterloo|3156|farmers/i.test(item.name)));
  });

  it('cleans polluted storeAddress and fixes DD/MM date on simple Walmart receipt', () => {
    const ocrText = `Walmart
Phoenix, AZ
23/03/2026 4:03 PM
Eggs.
Bread
......$2.99
Orange Juice .
$4.29
SUBTOTAL ........ $14.77
TAX
TOTAL
$15.95`;

    const draft: ParsedReceiptDraft = {
      storeName: 'Walmart',
      date: '2023-03-26',
      subtotal: 14.77,
      tax: 1.18,
      total: 15.95,
      storeAddress: 'Eggs ... $3.49 / Bread ... $2.99 / Phoenix, AZ',
      items: [
        { name: 'Eggs', price: 3.49, quantity: 1 },
        { name: 'Bread', price: 2.99, quantity: 1 },
        { name: 'Orange Juice', price: 4.29, quantity: 1 },
      ],
    };

    const result = finalizeReceiptDraft(draft, ocrText, null);

    assert.equal(result.date, '2026-03-23');
    assert.equal(result.storeCity, 'Phoenix');
    assert.equal(result.storeRegion, 'AZ');
    assert.equal(result.storeAddress, undefined);
    assert.ok(!/eggs|bread/i.test(result.storeAddress ?? ''));
  });
});
