import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatTaxSummary,
  getEffectiveTaxRateLabel,
  parsePrintedTaxRateFromText,
} from './taxRateUtils';

describe('parsePrintedTaxRateFromText', () => {
  it('reads HST (13%) from Canadian footer', () => {
    assert.equal(parsePrintedTaxRateFromText('HST (13%)\n$2.53'), 13);
  });

  it('reads inline GST rate', () => {
    assert.equal(parsePrintedTaxRateFromText('GST 5% $1.00'), 5);
  });
});

describe('getEffectiveTaxRateLabel', () => {
  it('shows printed HST rate on tax-inclusive Canadian receipts', () => {
    const label = getEffectiveTaxRateLabel({
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      printedTaxRate: 13,
      storeRegion: 'ON',
      storeCountry: 'CA',
    });
    assert.equal(label, 'HST 13%');
  });

  it('falls back to province rate when subtotal equals total', () => {
    const label = getEffectiveTaxRateLabel({
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      storeRegion: 'ON',
      storeCountry: 'CA',
    });
    assert.equal(label, 'HST 13%');
  });

  it('derives rate on standard subtotal + tax footers with receipt address', () => {
    const label = getEffectiveTaxRateLabel({
      subtotal: 14.77,
      tax: 1.18,
      total: 15.95,
      storeRegion: 'TX',
      storeCountry: 'US',
      storeCity: 'Houston',
      storePostalCode: '77082',
    });
    assert.equal(label, 'TX tax 7.99%');
  });

  it('uses generic tax label when state was not printed on the receipt', () => {
    const label = getEffectiveTaxRateLabel({
      subtotal: 518.85,
      tax: 42.77,
      total: 561.62,
      storeRegion: 'PA',
      storeCountry: 'US',
    });
    assert.equal(label, 'Tax rate 8.24%');
  });
});

describe('formatTaxSummary', () => {
  it('formats HST 13% for Waterloo Walmart draft', () => {
    const summary = formatTaxSummary({
      subtotal: 62.54,
      tax: 2.53,
      total: 62.54,
      printedTaxRate: 13,
      storeRegion: 'ON',
      storeCountry: 'CA',
    });
    assert.match(summary ?? '', /HST 13%/);
    assert.match(summary ?? '', /\$2\.53/);
  });
});
