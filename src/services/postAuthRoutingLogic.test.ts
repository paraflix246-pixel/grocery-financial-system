import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isPaywallPath,
  resolveAdminPaywallBypassRoute,
  resolvePostOAuthRoute,
} from '@/src/services/postAuthRoutingLogic';

describe('resolvePostOAuthRoute', () => {
  it('routes admin users to onboarding upgrade (same as non-admin)', () => {
    const result = resolvePostOAuthRoute(true, 'web');
    assert.equal(result.href, '/onboarding/upgrade');
    assert.equal(result.reason, 'upgrade');
  });

  it('routes native admin users to onboarding upgrade', () => {
    const result = resolvePostOAuthRoute(true, 'native');
    assert.equal(result.href, '/onboarding/upgrade');
    assert.equal(result.reason, 'upgrade');
  });

  it('routes signup OAuth to onboarding subscription', () => {
    const result = resolvePostOAuthRoute(false, 'web', 'signup');
    assert.equal(result.href, '/onboarding/upgrade');
    assert.equal(result.reason, 'upgrade');
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
  it('sends web admins to home tabs', () => {
    assert.equal(resolveAdminPaywallBypassRoute('web'), '/(tabs)');
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
