import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatDisplayDate,
  guessDateFromText,
  normalizeReceiptDate,
  resolveReceiptDate,
} from '@/src/utils/dateParser';

describe('guessDateFromText', () => {
  it('parses DD/MM/YYYY when day exceeds 12', () => {
    assert.equal(guessDateFromText('23/03/2026 4:03 PM'), '2026-03-23');
  });

  it('parses US MM/DD/YYYY when both parts are <= 12', () => {
    assert.equal(guessDateFromText('06/08/26'), '2026-06-08');
  });

  it('parses MM/DD when second part exceeds 12', () => {
    assert.equal(guessDateFromText('03/26/2023'), '2023-03-26');
  });

  it('returns null for impossible dates', () => {
    assert.equal(guessDateFromText('32/13/2026'), null);
  });
});

describe('resolveReceiptDate', () => {
  it('prefers OCR DD/MM date over stale AI misread', () => {
    const ocrText = 'Walmart\nPhoenix, AZ\n23/03/2026 4:03 PM\nEggs 3.49';
    assert.equal(resolveReceiptDate('2023-03-26', ocrText), '2026-03-23');
  });

  it('fixes implausible AI year using OCR header', () => {
    const ocrText = 'Walmart Supercenter\n06/08/26\nMILK 7.96';
    assert.equal(resolveReceiptDate('2008-06-26', ocrText), '2026-06-08');
  });
});

describe('formatDisplayDate', () => {
  it('formats normalized ISO dates for display', () => {
    assert.equal(formatDisplayDate('2026-03-23'), 'Mar 23, 2026');
  });

  it('normalizes slash dates before display', () => {
    assert.equal(formatDisplayDate('23/03/2026'), 'Mar 23, 2026');
  });
});

describe('normalizeReceiptDate', () => {
  it('accepts ISO dates in range', () => {
    assert.equal(normalizeReceiptDate('2026-03-23'), '2026-03-23');
  });
});
