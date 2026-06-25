import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mapDeepReadJobToDraft } from '@/src/services/deepreadReceiptMapper';

test('mapDeepReadJobToDraft maps structured receipt fields', () => {
  const result = mapDeepReadJobToDraft({
    id: 'job-1',
    status: 'completed',
    document: {
      content: {
        text: 'Walmart\nMILK 2 GAL 7.96\nSUBTOTAL 7.96\nTAX 0.64\nTOTAL 8.60',
      },
    },
    extraction: {
      fields: [
        { key: 'store_name', value: 'Walmart', needs_review: false },
        { key: 'date', value: '2026-06-08', needs_review: false },
        { key: 'subtotal', value: 7.96, needs_review: false },
        { key: 'tax', value: 0.64, needs_review: false },
        { key: 'total', value: 8.6, needs_review: false },
        {
          key: 'items',
          value: [{ name: 'MILK 2 GAL', price: 7.96, quantity: 1 }],
          needs_review: false,
        },
      ],
    },
    review: { needs_review: false, review_rate: 0 },
  });

  assert.ok(result);
  assert.equal(result.draft.storeName, 'Walmart');
  assert.equal(result.draft.date, '2026-06-08');
  assert.equal(result.draft.total, 8.6);
  assert.equal(result.parseVerified, true);
});

test('mapDeepReadJobToDraft infers CA country from Ontario region', () => {
  const result = mapDeepReadJobToDraft({
    id: 'job-ca',
    status: 'completed',
    document: {
      content: {
        text: 'Walmart\n335 Farmers Market Road\nWaterloo, ON N2V 0A4\nSUBTOTAL 62.54\nHST (13%)\n$2.53\nTOTAL 62.54',
      },
    },
    extraction: {
      fields: [
        { key: 'store_name', value: 'Walmart', needs_review: false },
        { key: 'store_city', value: 'Waterloo', needs_review: false },
        { key: 'store_region', value: 'ON', needs_review: false },
        { key: 'store_postal_code', value: 'N2V 0A4', needs_review: false },
        { key: 'date', value: '2023-10-05', needs_review: false },
        { key: 'subtotal', value: 62.54, needs_review: false },
        { key: 'tax', value: 2.53, needs_review: false },
        { key: 'total', value: 62.54, needs_review: false },
        {
          key: 'items',
          value: [{ name: 'MILK 4L', price: 5.29, quantity: 1 }],
          needs_review: false,
        },
      ],
    },
    review: { needs_review: false, review_rate: 0 },
  });

  assert.ok(result);
  assert.equal(result.draft.storeCountry, 'CA');
  assert.equal(result.draft.storeRegion, 'ON');
  assert.equal(result.draft.printedTaxRate, 13);
});

test('mapDeepReadJobToDraft flags needs review', () => {
  const result = mapDeepReadJobToDraft({
    id: 'job-2',
    status: 'completed',
    document: { content: { text: 'TOTAL 10.00' } },
    extraction: {
      fields: [
        { key: 'store_name', value: 'Store', needs_review: false },
        { key: 'total', value: 10, needs_review: true },
        { key: 'items', value: [{ name: 'ITEM', price: 10, quantity: 1 }], needs_review: false },
      ],
    },
    review: { needs_review: true, review_rate: 0.2 },
  });

  assert.ok(result);
  assert.equal(result.needsReview, true);
  assert.equal(result.parseVerified, false);
});

test('mapDeepReadJobToDraft flags locationNeedsReview when store location fields need review', () => {
  const result = mapDeepReadJobToDraft({
    id: 'job-3',
    status: 'completed',
    document: { content: { text: 'Store\nTOTAL 10.00' } },
    extraction: {
      fields: [
        { key: 'store_name', value: 'Store', needs_review: false },
        { key: 'store_region', value: 'TX', needs_review: true },
        { key: 'total', value: 10, needs_review: false },
        { key: 'items', value: [{ name: 'ITEM', price: 10, quantity: 1 }], needs_review: false },
      ],
    },
    review: { needs_review: false, review_rate: 0 },
  });

  assert.ok(result);
  assert.equal(result.locationNeedsReview, true);
});

test('mapDeepReadJobToDraft fixes survey junk on first line when raw text has Canadian rows', () => {
  const ocrText = `Walmart
A:T:MATCHAL
SPAGHETTI
$1.97 H
CARROTS 2LB
$2.44 H
SUBTOTAL
$4.41
HST (13%)
$0.51
TOTAL
$4.41`;

  const result = mapDeepReadJobToDraft({
    id: 'job-survey',
    status: 'completed',
    document: { content: { text: ocrText } },
    extraction: {
      fields: [
        { key: 'store_name', value: 'Walmart', needs_review: false },
        { key: 'store_number', value: '3156', needs_review: false },
        { key: 'date', value: '2026-06-20', needs_review: false },
        { key: 'subtotal', value: 4.41, needs_review: false },
        { key: 'tax', value: 0.51, needs_review: false },
        { key: 'total', value: 4.41, needs_review: false },
        {
          key: 'items',
          value: [
            { name: 'A:T:MATCHAL', price: 1.97, quantity: 1 },
            { name: 'CARROTS 2LB', price: 2.44, quantity: 1 },
          ],
          needs_review: true,
        },
      ],
    },
    review: { needs_review: true, review_rate: 0.1 },
  });

  assert.ok(result);
  assert.equal(result.draft.storeNumber, '3156');
  assert.equal(result.draft.items[0]?.name, 'SPAGHETTI');
  assert.equal(result.draft.items[0]?.price, 1.97);
  assert.ok(result.draft.items.every((item) => item.name !== 'A:T:MATCHAL'));
});
test('mapDeepReadJobToDraft flags locationNeedsReview when region and address are missing', () => {
  const result = mapDeepReadJobToDraft({
    id: 'job-4',
    status: 'completed',
    document: { content: { text: 'Store\nTOTAL 10.00' } },
    extraction: {
      fields: [
        { key: 'store_name', value: 'Store', needs_review: false },
        { key: 'total', value: 10, needs_review: false },
        { key: 'items', value: [{ name: 'ITEM', price: 10, quantity: 1 }], needs_review: false },
      ],
    },
    review: { needs_review: false, review_rate: 0 },
  });

  assert.ok(result);
  assert.equal(result.locationNeedsReview, true);
});
