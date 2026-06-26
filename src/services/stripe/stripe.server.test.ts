import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import {
  isStripeSubscriptionActive,
  planFromStripePriceId,
} from './stripe.server';

describe('stripe.server', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_monthly_test';
    process.env.STRIPE_PRICE_PRO_YEARLY = 'price_yearly_test';
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('maps configured price IDs to plans', () => {
    assert.equal(planFromStripePriceId('price_monthly_test'), 'monthly');
    assert.equal(planFromStripePriceId('price_yearly_test'), 'yearly');
  });

  it('treats active, trialing, and past_due as active', () => {
    assert.equal(isStripeSubscriptionActive('active'), true);
    assert.equal(isStripeSubscriptionActive('trialing'), true);
    assert.equal(isStripeSubscriptionActive('past_due'), true);
    assert.equal(isStripeSubscriptionActive('canceled'), false);
    assert.equal(isStripeSubscriptionActive('incomplete'), false);
  });
});
