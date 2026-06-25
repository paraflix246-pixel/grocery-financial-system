import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseReceiptText } from '@/src/services/receiptParser';
import { finalizeReceiptDraft } from '@/src/utils/receiptDraftNormalizer';
import { computeItemsSubtotal } from '@/src/utils/receiptTotals';

/** PaddleOCR output for Target receipt — name / T / price split across lines. */
const TARGET_SPLIT_OCR = `Houston E1dridge Pkwy - 281-810-5251
2700 E1dridge Pkwy
Houston, Texas 77082-6870
02/25/2026 02:59 PM
APPAREL
096077026 Uni Thread
T
$35.00
096056095 A New Day
T
$35.00
096074337 Uni Thread
T
$35.00
096056098 A New Day
T
$35.00
096056097 A New Day
T
$35.00
096078914 Uni Thread
T
$35.00
096072602 Uni Thread
T
$35.00
096056096 A New Day
T
$35.00
HOME
074021551 Threshold
T
$200.00
074020113 FL00R LAMPS
T
$75.00
SUBTOTAL
$555.00
T = TX TAX 8.25000 on $555.00
$45.79
TOTAL
$600.79
CASH PAYMENT
$600.00
*9310 DEBIT TOTAL PAYMENT
$0.79
Help make your Target Run better.
informtarget.com`;

describe('parseReceiptText — Target split-line OCR', () => {
  it('parses 10 items with correct footer totals', () => {
    const draft = parseReceiptText(TARGET_SPLIT_OCR);

    assert.equal(draft.storeName, 'Target');
    assert.equal(draft.date, '2026-02-25');
    assert.equal(draft.items.length, 10);
    assert.equal(draft.subtotal, 555);
    assert.equal(draft.tax, 45.79);
    assert.equal(draft.total, 600.79);
    assert.equal(computeItemsSubtotal(draft.items), 555);
  });

  it('finalizes without trimming items to a wrong subtotal', () => {
    const textDraft = parseReceiptText(TARGET_SPLIT_OCR);
    const result = finalizeReceiptDraft(textDraft, TARGET_SPLIT_OCR, textDraft);

    assert.equal(result.storeName, 'Target');
    assert.equal(result.items.length, 10);
    assert.equal(result.subtotal, 555);
    assert.equal(result.tax, 45.79);
    assert.equal(result.total, 600.79);
    assert.ok(!result.items.some((item) => item.name === 'APPAREL'));
    assert.ok(!result.items.some((item) => item.name === 'HOME'));
  });
});

describe('parseReceiptText — Walmart Canada promo footer junk', () => {
  it('parses inline promo footer OCR lines as other', () => {
    const ocrText = `Walmart
BREAD WHEAT
$2.99 H
BREAD ONLY $2.99 H
CARATOES WHEAT $2.99 H
SH TOMRTH
$1.99 H
UMBERY DIS
$2.99 H
CORFORT
$2.99 H
SUBTOTAL
$62.54
TOTAL
$62.54`;

    const draft = parseReceiptText(ocrText);
    const other = draft.items.filter((item) => item.lineKind === 'other');

    assert.equal(other.length, 5);
    for (const name of [
      'BREAD ONLY',
      'CARATOES WHEAT',
      'SH TOMRTH',
      'UMBERY DIS',
      'CORFORT',
    ]) {
      assert.ok(other.some((item) => item.name === name), `missing ${name}`);
    }
    assert.ok(draft.items.some((item) => item.name === 'BREAD WHEAT'));
  });
});
