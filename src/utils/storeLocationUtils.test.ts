import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { hasReceiptPrintedAddress } from '@/src/utils/storeLocationUtils';

describe('hasReceiptPrintedAddress', () => {
  it('is false when only a state code is present', () => {
    assert.equal(hasReceiptPrintedAddress({ storeRegion: 'PA', storeCountry: 'US' }), false);
  });

  it('is true when a street or city line is present', () => {
    assert.equal(
      hasReceiptPrintedAddress({
        storeCity: 'Houston',
        storeRegion: 'TX',
        storePostalCode: '77082',
      }),
      true
    );
  });
});
