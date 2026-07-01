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

  it('does not derive rate from subtotal and tax when receipt omitted a rate', () => {
    const label = getEffectiveTaxRateLabel({
      subtotal: 14.77,
      tax: 1.18,
      total: 15.95,
      storeRegion: 'AZ',
      storeCountry: 'US',
      storeCity: 'Phoenix',
      storePostalCode: '85001',
    });
    assert.equal(label, null);
  });

  it('shows printed rate from OCR when receipt includes a percentage', () => {
    const label = getEffectiveTaxRateLabel({
      subtotal: 14.77,
      tax: 1.18,
      total: 15.95,
      printedTaxRate: 7.99,
      storeRegion: 'AZ',
      storeCountry: 'US',
      storeCity: 'Phoenix',
      storePostalCode: '85001',
    });
    assert.equal(label, 'AZ tax 7.99%');
  });

  it('does not infer generic tax rate without a printed percentage', () => {
    const label = getEffectiveTaxRateLabel({
      subtotal: 518.85,
      tax: 42.77,
      total: 561.62,
      storeRegion: 'PA',
      storeCountry: 'US',
    });
    assert.equal(label, null);
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

  it('returns null for Walmart-style TAX amount without printed rate', () => {
    const summary = formatTaxSummary({
      subtotal: 14.77,
      tax: 1.18,
      total: 15.95,
      storeRegion: 'AZ',
      storeCountry: 'US',
      storeCity: 'Phoenix',
      storePostalCode: '85001',
    });
    assert.equal(summary, null);
  });
});
