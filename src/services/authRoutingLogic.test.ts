import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveInitialRoute, type AuthRoutingContext } from '@/src/services/authRoutingLogic';

function baseContext(overrides: Partial<AuthRoutingContext> = {}): AuthRoutingContext {
  return {
    onboardingComplete: true,
    hasSupabaseSession: true,
    storedUser: null,
    rememberMe: true,
    lastActivityAt: Date.now(),
    now: Date.now(),
    platform: 'web',
    isAdmin: false,
    ...overrides,
  };
}

describe('resolveInitialRoute', () => {
  it('routes web admins with session to /admin', () => {
    const result = resolveInitialRoute(baseContext({ isAdmin: true, platform: 'web' }));
    assert.equal(result.href, '/admin');
    assert.equal(result.reason, 'dashboard');
  });

  it('routes unsigned web admins to onboarding', () => {
    const result = resolveInitialRoute(
      baseContext({ isAdmin: true, platform: 'web', hasSupabaseSession: false, storedUser: null })
    );
    assert.equal(result.href, '/onboarding');
    assert.equal(result.reason, 'onboarding_incomplete');
  });

  it('routes native admins to tabs', () => {
    const result = resolveInitialRoute(baseContext({ isAdmin: true, platform: 'native' }));
    assert.equal(result.href, '/(tabs)');
    assert.equal(result.reason, 'dashboard');
  });

  it('routes regular users to tabs', () => {
    const result = resolveInitialRoute(baseContext({ isAdmin: false, platform: 'web' }));
    assert.equal(result.href, '/(tabs)');
    assert.equal(result.reason, 'dashboard');
  });
});
