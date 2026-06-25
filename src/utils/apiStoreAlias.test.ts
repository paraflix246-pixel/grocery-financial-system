import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveApiStoreName } from '@/src/utils/apiStoreAlias';

const catalog = ['Aldi', 'Walmart', 'Target', 'Kroger', 'Costco'];

describe('resolveApiStoreName', () => {
  it('matches exact catalog store names', () => {
    assert.equal(resolveApiStoreName('Target', catalog), 'Target');
  });

  it('maps Kroger-family banners to Kroger', () => {
    assert.equal(
      resolveApiStoreName('Ralphs Fresh Fare - Beverly Doheny', catalog),
      'Kroger'
    );
  });

  it('maps partial web retailer names to catalog stores', () => {
    assert.equal(resolveApiStoreName('Walmart.com', catalog), 'Walmart');
  });

  it('returns original name when no catalog match exists', () => {
    assert.equal(resolveApiStoreName('Whole Foods Market', catalog), 'Whole Foods Market');
  });
});
