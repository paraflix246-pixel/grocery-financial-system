import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assessReceiptLikelihood } from './receiptLikelihoodLogic';

describe('assessReceiptLikelihood', () => {
  it('rejects very short text', () => {
    assert.equal(assessReceiptLikelihood('hi').likelyReceipt, false);
  });

  it('rejects photos without prices', () => {
    assert.equal(assessReceiptLikelihood('A sunny day at the park with friends').likelyReceipt, false);
  });

  it('accepts typical receipt OCR', () => {
    const text = `KROGER #123\nMILK 3.49\nBREAD 2.99\nSUBTOTAL 6.48\nTAX 0.52\nTOTAL 7.00`;
    assert.equal(assessReceiptLikelihood(text).likelyReceipt, true);
  });

  it('accepts multiple prices even without total keyword', () => {
    assert.equal(assessReceiptLikelihood('ITEM A 1.99\nITEM B 2.49\nITEM C 0.99').likelyReceipt, true);
  });
});
