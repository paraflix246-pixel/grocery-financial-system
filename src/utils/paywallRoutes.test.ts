import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPaywallHref,
  parseInitialPaywallPlan,
} from './paywallRoutes';

describe('paywallRoutes', () => {
  it('builds family paywall href with plan=family', () => {
    assert.equal(buildPaywallHref('family'), '/paywall?plan=family');
    assert.equal(buildPaywallHref(), '/paywall');
    assert.equal(buildPaywallHref('pro'), '/paywall');
  });

  it('parses family intent from query params', () => {
    assert.equal(parseInitialPaywallPlan({ plan: 'family' }), 'family');
    assert.equal(parseInitialPaywallPlan({ plan: 'household' }), 'family');
    assert.equal(parseInitialPaywallPlan({ family: '1' }), 'family');
    assert.equal(parseInitialPaywallPlan({ family: 'true' }), 'family');
    assert.equal(parseInitialPaywallPlan({}), 'pro');
    assert.equal(parseInitialPaywallPlan({ plan: 'pro' }), 'pro');
    assert.equal(parseInitialPaywallPlan({ plan: 'free' }), 'free');
  });
});
