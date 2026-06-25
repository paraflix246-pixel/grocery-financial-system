import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatStoreLocationForCopy,
  inferStoreCountry,
  looksLikeAddressFieldJunk,
  normalizeStoreLocation,
  parseStoreLocationFromOcrText,
} from '@/src/utils/storeLocationParser';

describe('parseStoreLocationFromOcrText', () => {
  it('parses US Target Houston address', () => {
    const text = [
      'TARGET',
      '2700 Eldridge Pkwy',
      'Houston, TX 77082',
    ].join('\n');

    const location = parseStoreLocationFromOcrText(text);
    assert.equal(location.storeCity, 'Houston');
    assert.equal(location.storeRegion, 'TX');
    assert.equal(location.storePostalCode, '77082');
    assert.equal(location.storeCountry, 'US');
    assert.match(location.storeAddress ?? '', /Eldridge/);
  });

  it('parses Canadian Walmart Waterloo address', () => {
    const text = [
      'WALMART',
      '335 Farmers Market Road',
      'Waterloo, ON N2V 0A4',
    ].join('\n');

    const location = parseStoreLocationFromOcrText(text);
    assert.equal(location.storeCity, 'Waterloo');
    assert.equal(location.storeRegion, 'ON');
    assert.equal(location.storePostalCode, 'N2V 0A4');
    assert.equal(location.storeCountry, 'CA');
  });

  it('formats copy text with street and city line', () => {
    const copy = formatStoreLocationForCopy({
      storeAddress: '2700 Eldridge Pkwy',
      storeCity: 'Houston',
      storeRegion: 'TX',
      storePostalCode: '77082',
    });
    assert.match(copy, /2700 Eldridge/);
    assert.match(copy, /Houston, TX, 77082/);
    assert.match(copy, /United States/);
  });

  it('infers CA country from Ontario postal code', () => {
    assert.equal(
      inferStoreCountry({ storeRegion: 'ON', storePostalCode: 'N2V 0A4' }),
      'CA'
    );
  });

  it('splits duplicated city line out of storeAddress', () => {
    const normalized = normalizeStoreLocation({
      storeAddress: '335 Farmers Market Road\nWaterloo, ON N2V 0A4',
      storeCity: 'Waterloo',
      storeRegion: 'ON',
      storePostalCode: 'N2V 0A4',
    });
    assert.equal(normalized.storeAddress, '335 Farmers Market Road');
    assert.equal(normalized.storeCountry, 'CA');
  });

  it('strips line items from polluted storeAddress and keeps city', () => {
    const normalized = normalizeStoreLocation({
      storeAddress: 'Eggs ... $3.49 / Bread ... $2.99 / Phoenix, AZ',
    });
    assert.equal(normalized.storeAddress, undefined);
    assert.equal(normalized.storeCity, 'Phoenix');
    assert.equal(normalized.storeRegion, 'AZ');
    assert.equal(normalized.storeCountry, 'US');
  });

  it('parses Phoenix AZ without ZIP from OCR text', () => {
    const location = parseStoreLocationFromOcrText('Walmart\nPhoenix, AZ\n23/03/2026\nEggs 3.49');
    assert.equal(location.storeCity, 'Phoenix');
    assert.equal(location.storeRegion, 'AZ');
    assert.equal(location.storeCountry, 'US');
  });

  it('extracts region from city line stored in storeAddress only', () => {
    const normalized = normalizeStoreLocation({
      storeAddress: '123 Retail Row\nDallas, TX 75201',
    });
    assert.equal(normalized.storeCity, 'Dallas');
    assert.equal(normalized.storeRegion, 'TX');
    assert.equal(normalized.storePostalCode, '75201');
  });

  it('parses Bradford PA with comma before ZIP in storeCity', () => {
    const normalized = normalizeStoreLocation({
      storeAddress: '![img-0.jpeg](img-0.jpeg)',
      storeCity: 'Bradford, PA, 16701',
    });
    assert.equal(normalized.storeAddress, undefined);
    assert.equal(normalized.storeCity, 'Bradford');
    assert.equal(normalized.storeRegion, 'PA');
    assert.equal(normalized.storePostalCode, '16701');
    assert.equal(normalized.storeCountry, 'US');
  });

  it('strips markdown image refs from storeAddress', () => {
    assert.equal(
      looksLikeAddressFieldJunk('![img-0.jpeg](img-0.jpeg)'),
      true
    );
    const normalized = normalizeStoreLocation({
      storeAddress: '![img-0.jpeg](img-0.jpeg)',
      storeCity: 'Bradford, PA 16701',
    });
    assert.equal(normalized.storeAddress, undefined);
    assert.equal(normalized.storeRegion, 'PA');
    assert.match(formatStoreLocationForCopy(normalized), /Bradford, PA, 16701/);
    assert.doesNotMatch(formatStoreLocationForCopy(normalized), /PA,\s*PA/);
  });

  it('does not duplicate region when city equals state code', () => {
    const normalized = normalizeStoreLocation({
      storeCity: 'PA',
      storeRegion: 'PA',
      storeCountry: 'US',
    });
    assert.equal(normalized.storeCity, undefined);
    assert.equal(formatStoreLocationForCopy(normalized), 'PA\nUnited States');
  });
});
