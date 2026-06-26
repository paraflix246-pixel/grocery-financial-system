import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapStripeStatusToSubscriptionState,
  type StripeSubscriptionStatus,
} from './stripeSubscriptionMapper';

describe('stripeSubscriptionMapper', () => {
  it('maps active Stripe status to paid Pro state', () => {
    const status: StripeSubscriptionStatus = {
      configured: true,
      subscription: {
        active: true,
        status: 'active',
        plan: 'yearly',
        currentPeriodEnd: '2026-12-31T00:00:00.000Z',
        stripeCustomerId: 'cus_test',
      },
    };

    const state = mapStripeStatusToSubscriptionState(status);
    assert.ok(state);
    assert.equal(state.tier, 'pro');
    assert.equal(state.plan, 'yearly');
    assert.equal(state.subscriptionSource, 'paid');
    assert.equal(state.expiresAt, '2026-12-31T00:00:00.000Z');
    assert.equal(state.trialStartedAt, null);
  });

  it('returns null when subscription is inactive', () => {
    const status: StripeSubscriptionStatus = {
      configured: true,
      subscription: {
        active: false,
        status: 'canceled',
        plan: 'monthly',
        currentPeriodEnd: null,
        stripeCustomerId: 'cus_test',
      },
    };

    assert.equal(mapStripeStatusToSubscriptionState(status), null);
  });
});
