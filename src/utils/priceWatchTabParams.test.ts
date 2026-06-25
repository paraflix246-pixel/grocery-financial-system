import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPriceAlertsFormRequest,
  parsePriceWatchAction,
  parsePriceWatchTab,
} from '@/src/utils/priceWatchTabParams';

describe('priceWatchTabParams', () => {
  it('parses watchlist tab by default', () => {
    assert.equal(parsePriceWatchTab(undefined), 'watchlist');
    assert.equal(parsePriceWatchTab('watchlist'), 'watchlist');
    assert.equal(parsePriceWatchTab('alerts'), 'alerts');
  });

  it('parses new action', () => {
    assert.equal(parsePriceWatchAction(undefined), null);
    assert.equal(parsePriceWatchAction('new'), 'new');
  });

  it('builds form requests from query params', () => {
    assert.deepEqual(buildPriceAlertsFormRequest({ action: 'new' }), { type: 'new', itemName: undefined });
    assert.deepEqual(buildPriceAlertsFormRequest({ action: 'new', itemName: 'Eggs' }), {
      type: 'new',
      itemName: 'Eggs',
    });
    assert.deepEqual(buildPriceAlertsFormRequest({ editRuleId: 'rule-1' }), {
      type: 'edit',
      ruleId: 'rule-1',
    });
  });
});
