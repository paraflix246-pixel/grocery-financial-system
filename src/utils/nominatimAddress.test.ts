import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseNominatimResult, parseNominatimResults } from '@/src/utils/nominatimAddress';

describe('parseNominatimResult', () => {
  it('maps a US street address into store location fields', () => {
    const parsed = parseNominatimResult({
      place_id: 1,
      display_name: '123 Main St, Austin, Texas 78701, United States',
      address: {
        house_number: '123',
        road: 'Main St',
        city: 'Austin',
        state: 'Texas',
        postcode: '78701',
        country_code: 'us',
      },
    });

    assert.equal(parsed.storeAddress, '123 Main St');
    assert.equal(parsed.storeCity, 'Austin');
    assert.equal(parsed.storeRegion, 'TX');
    assert.equal(parsed.storePostalCode, '78701');
    assert.equal(parsed.storeCountry, 'US');
  });

  it('maps a Canadian address into store location fields', () => {
    const parsed = parseNominatimResult({
      place_id: 2,
      display_name: '100 King St W, Toronto, Ontario M5X 1A9, Canada',
      address: {
        house_number: '100',
        road: 'King St W',
        city: 'Toronto',
        state: 'Ontario',
        postcode: 'M5X 1A9',
        country_code: 'ca',
      },
    });

    assert.equal(parsed.storeCountry, 'CA');
    assert.equal(parsed.storeRegion, 'ON');
    assert.equal(parsed.storePostalCode, 'M5X 1A9');
  });
});

describe('parseNominatimResults', () => {
  it('filters to US and CA results only', () => {
    const parsed = parseNominatimResults([
      {
        place_id: 1,
        display_name: 'Paris, France',
        address: { city: 'Paris', country_code: 'fr' },
      },
      {
        place_id: 2,
        display_name: 'Austin, Texas',
        address: { city: 'Austin', state: 'Texas', country_code: 'us' },
      },
    ]);

    assert.equal(parsed.length, 1);
    assert.equal(parsed[0]?.storeCity, 'Austin');
  });
});
