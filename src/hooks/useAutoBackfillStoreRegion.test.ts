import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildRegionBackfillFromGeocodeMatch } from '@/src/hooks/useAutoBackfillStoreRegion';

describe('buildRegionBackfillFromGeocodeMatch', () => {
  it('fills region only and never injects geocoded street address', () => {
    const partial = buildRegionBackfillFromGeocodeMatch(
      {
        storeName: 'Walmart',
        storeNumber: '3885',
        storeCity: 'Bradford',
        storePostalCode: '16701',
      },
      {
        storeAddress: '50 Foster Brook Boulevard',
        storeCity: 'Bradford',
        storeRegion: 'PA',
        storePostalCode: '16701',
        storeCountry: 'US',
      }
    );

    assert.deepEqual(partial, {
      storeRegion: 'PA',
      storeCountry: 'US',
    });
    assert.equal('storeAddress' in partial, false);
    assert.equal('storeCity' in partial, false);
    assert.equal('storePostalCode' in partial, false);
  });
});
