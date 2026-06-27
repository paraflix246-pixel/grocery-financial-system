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
  it('routes web admins to /admin', () => {
    const result = resolveInitialRoute(baseContext({ isAdmin: true, platform: 'web' }));
    assert.equal(result.href, '/admin');
    assert.equal(result.reason, 'dashboard');
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
