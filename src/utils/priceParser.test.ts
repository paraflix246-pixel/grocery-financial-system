import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseLineEndPrice, parsePrice, parseTaxLineAmount } from './priceParser';

describe('parsePrice', () => {
  it('parses PaddleOCR spaced cents like "$6 75"', () => {
    assert.equal(parsePrice('$6 75 H'), 6.75);
    assert.equal(parseLineEndPrice('YEAST INSTANT $6 75 H'), 6.75);
  });
});

describe('parseTaxLineAmount', () => {
  it('extracts amounts from tax summary lines', () => {
    assert.equal(parseTaxLineAmount('T = TX TAX 8.25000 on $555.00'), 8.25);
    assert.equal(parseTaxLineAmount('Sales tax $45.79'), 45.79);
  });
});
