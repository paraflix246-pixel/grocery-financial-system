import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatUnitPriceLabel, parseUnitPriceFromLine } from '@/src/utils/unitPriceParser';

describe('parseUnitPriceFromLine', () => {
  it('parses @ price per lb', () => {
    const parsed = parseUnitPriceFromLine('RIBEYE @ 8.48/lb');
    assert.equal(parsed.unitPrice, 8.48);
    assert.equal(parsed.unit, 'lb');
  });

  it('parses ea unit price', () => {
    const parsed = parseUnitPriceFromLine('0.59 ea');
    assert.equal(parsed.unitPrice, 0.59);
    assert.equal(parsed.unit, 'ea');
  });

  it('parses metric units', () => {
    const parsed = parseUnitPriceFromLine('@ 1.99/L');
    assert.equal(parsed.unitPrice, 1.99);
    assert.equal(parsed.unit, 'L');
  });
});

describe('formatUnitPriceLabel', () => {
  it('formats readable label', () => {
    assert.equal(formatUnitPriceLabel(2.48, 'lb'), '$2.48/lb');
  });
});
