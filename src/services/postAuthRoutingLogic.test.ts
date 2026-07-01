import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isPaywallPath,
  resolveAdminPaywallBypassRoute,
  resolvePostOAuthRoute,
} from '@/src/services/postAuthRoutingLogic';

describe('resolvePostOAuthRoute', () => {
  it('routes admin users to admin on web', () => {
    const result = resolvePostOAuthRoute(true, 'web');
    assert.equal(result.href, '/admin');
    assert.equal(result.reason, 'admin');
  });

  it('routes admin users to home on native', () => {
    const result = resolvePostOAuthRoute(true, 'native');
    assert.equal(result.href, '/(tabs)');
    assert.equal(result.reason, 'admin');
  });

  it('routes signup OAuth to join-household', () => {
    const result = resolvePostOAuthRoute(false, 'web', 'signup');
    assert.equal(result.href, '/onboarding/join-household');
    assert.equal(result.reason, 'join_household');
  });

  it('routes signin OAuth to onboarding upgrade', () => {
    const result = resolvePostOAuthRoute(false, 'web', 'signin');
    assert.equal(result.href, '/onboarding/upgrade');
    assert.equal(result.reason, 'upgrade');
  });

  it('defaults non-admin users to onboarding upgrade', () => {
    const result = resolvePostOAuthRoute(false, 'web');
    assert.equal(result.href, '/onboarding/upgrade');
    assert.equal(result.reason, 'upgrade');
  });
});

describe('resolveAdminPaywallBypassRoute', () => {
  it('sends web admins to admin dashboard', () => {
    assert.equal(resolveAdminPaywallBypassRoute('web'), '/admin');
  });

  it('sends native admins to home tabs', () => {
    assert.equal(resolveAdminPaywallBypassRoute('native'), '/(tabs)');
  });
});

describe('isPaywallPath', () => {
  it('matches paywall and onboarding upgrade routes', () => {
    assert.equal(isPaywallPath('/paywall'), true);
    assert.equal(isPaywallPath('/paywall?family=1'), true);
    assert.equal(isPaywallPath('/onboarding/upgrade'), true);
    assert.equal(isPaywallPath('/(tabs)'), false);
    assert.equal(isPaywallPath('/admin'), false);
  });
});
