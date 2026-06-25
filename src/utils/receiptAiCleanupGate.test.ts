import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { ParsedReceiptDraft } from '@/src/models/types';
import {
  draftHasSurveyJunk,
  getReceiptAiCleanupReasons,
  hasMissingFeeLine,
  shouldRunReceiptAiCleanup,
} from '@/src/utils/receiptAiCleanupGate';

function draft(overrides: Partial<ParsedReceiptDraft> = {}): ParsedReceiptDraft {
  return {
    storeName: 'Walmart',
    date: '2026-06-08',
    subtotal: 10,
    tax: 0.8,
    total: 10.8,
    items: [{ name: 'MILK', price: 10, quantity: 1 }],
    ...overrides,
  };
}

describe('shouldRunReceiptAiCleanup', () => {
  it('flags needsReview', () => {
    assert.equal(
      shouldRunReceiptAiCleanup({
        draft: draft(),
        needsReview: true,
        parseVerified: false,
      }),
      true
    );
    assert.deepEqual(
      getReceiptAiCleanupReasons({
        draft: draft(),
        needsReview: true,
        parseVerified: false,
      }),
      ['needs_review']
    );
  });

  it('flags parseVerified false without needsReview', () => {
    assert.equal(
      shouldRunReceiptAiCleanup({
        draft: draft(),
        parseVerified: false,
      }),
      true
    );
  });

  it('flags items_total_mismatch when footer is broken and gap exceeds $0.15', () => {
    const mismatched = draft({
      subtotal: 10,
      tax: 0.8,
      total: 12,
      items: [{ name: 'MILK', price: 9.5, quantity: 1 }],
    });
    assert.equal(shouldRunReceiptAiCleanup({ draft: mismatched, parseVerified: true }), true);
    assert.ok(
      getReceiptAiCleanupReasons({ draft: mismatched, parseVerified: true }).includes(
        'items_total_mismatch'
      )
    );
  });

  it('skips cleanup when subtotal gap is within tolerance', () => {
    const closeEnough = draft({
      subtotal: 10,
      items: [{ name: 'MILK', price: 9.9, quantity: 1 }],
    });
    assert.equal(shouldRunReceiptAiCleanup({ draft: closeEnough, parseVerified: true }), false);
  });

  it('flags survey junk on first line', () => {
    const withJunk = draft({
      items: [
        { name: 'A:T:MATCHAL', price: 2.47, quantity: 1 },
        { name: 'SPAGHETTI', price: 2.47, quantity: 1 },
      ],
    });
    assert.equal(draftHasSurveyJunk(withJunk), true);
    assert.ok(
      getReceiptAiCleanupReasons({ draft: withJunk, parseVerified: true }).includes('survey_junk')
    );
  });

  it('flags missing payment fee when OCR text has CHARGE PYMT', () => {
    const ocrText = 'SPAGHETTI 2.47\nCHARGE PYMT D68 QTY 1 4.06\nSUBTOTAL 6.53';
    const withoutFee = draft({
      subtotal: 6.53,
      items: [{ name: 'SPAGHETTI', price: 2.47, quantity: 1 }],
    });
    assert.equal(hasMissingFeeLine(withoutFee, ocrText), true);
    assert.ok(
      getReceiptAiCleanupReasons({
        draft: withoutFee,
        ocrText,
        parseVerified: true,
      }).includes('missing_fee_line')
    );
  });

  it('flags likely missing fee on large Canadian HST receipt when OCR text truncated', () => {
    const withoutFee = draft({
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      items: Array.from({ length: 12 }, (_, index) => ({
        name: `ITEM ${index + 1}`,
        price: 5,
        quantity: 1,
      })),
    });
    assert.equal(hasMissingFeeLine(withoutFee, 'Walmart\nSUBTOTAL 62.54'), true);
  });

  it('does not flag when fee line is already present', () => {
    const ocrText = 'SPAGHETTI 2.47\nCHARGE PYMT D68 QTY 1 4.06\nSUBTOTAL 6.53';
    const withFee = draft({
      subtotal: 6.53,
      items: [
        { name: 'SPAGHETTI', price: 2.47, quantity: 1 },
        { name: 'CHARGE PYMT D68 QTY 1', price: 4.06, quantity: 1, lineKind: 'fee' },
      ],
    });
    assert.equal(hasMissingFeeLine(withFee, ocrText), false);
  });
});
