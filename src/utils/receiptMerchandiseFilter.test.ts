import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyReceiptLineKind,
  isBuyAgainEligibleItem,
  isPaymentLineName,
  looksLikePromoFooterJunk,
} from './receiptMerchandiseFilter';

describe('classifyReceiptLineKind', () => {
  it('classifies payment and promo rows', () => {
    assert.equal(classifyReceiptLineKind('CHARGE PYMT D68 QTY 1'), 'fee');
    assert.equal(classifyReceiptLineKind('BREAD ONLY'), 'other');
    assert.equal(classifyReceiptLineKind('SPAGHETTI'), 'merchandise');
  });
});

describe('isBuyAgainEligibleItem', () => {
  it('excludes payment fees and promo junk from buy-again suggestions', () => {
    assert.equal(isBuyAgainEligibleItem('CHARGE PYMT D68 QTY 1'), false);
    assert.equal(isBuyAgainEligibleItem('CHARGE PYMT D68 QTY 1', 'fee'), false);
    assert.equal(isBuyAgainEligibleItem('BREAD ONLY', 'other'), false);
    assert.equal(isBuyAgainEligibleItem('MILK 4L'), true);
    assert.equal(isBuyAgainEligibleItem('CHICKEN DRUMSTICKS', 'merchandise'), true);
  });
});

describe('isPaymentLineName', () => {
  it('detects Walmart Canada charge payment rows', () => {
    assert.equal(isPaymentLineName('CHARGE PYMT D68'), true);
    assert.equal(isPaymentLineName('CHARGE PYMT D68 QTY 1'), true);
    assert.equal(isPaymentLineName('PYMT D68 QTY 1'), true);
  });

  it('does not flag grocery product names', () => {
    assert.equal(isPaymentLineName('CHICKEN DRUMSTICKS'), false);
    assert.equal(isPaymentLineName('TOMATOES ON VINE'), false);
    assert.equal(isPaymentLineName('CHIPITS HERSHEY'), false);
  });
});

describe('looksLikePromoFooterJunk', () => {
  it('detects credit-card promo OCR fragments', () => {
    assert.equal(looksLikePromoFooterJunk('BREAD ONLY'), true);
    assert.equal(looksLikePromoFooterJunk('CARATOES WHEAT'), true);
    assert.equal(looksLikePromoFooterJunk('SH TOMRTH'), true);
    assert.equal(looksLikePromoFooterJunk('UMBERY DIS'), true);
    assert.equal(looksLikePromoFooterJunk('CORFORT'), true);
  });

  it('does not flag legitimate grocery names', () => {
    assert.equal(looksLikePromoFooterJunk('BREAD WHEAT'), false);
    assert.equal(looksLikePromoFooterJunk('CARROTS 2LB'), false);
    assert.equal(looksLikePromoFooterJunk('TOMATOES ON VINE'), false);
  });
});
