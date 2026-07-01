import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WEB_IDLE_TIMEOUT_MS,
  buildPostLogoutHref,
  isIdleTimedOut,
  needsReauthentication,
  POST_LOGOUT_SIGNIN_ROUTE,
  resolveInitialRoute,
  shouldPromptLogin,
  type AuthRoutingContext,
} from '@/src/services/authRoutingLogic';

function ctx(partial: Partial<AuthRoutingContext>): AuthRoutingContext {
  return {
    onboardingComplete: true,
    hasSupabaseSession: true,
    authStateResolved: true,
    storedUser: { id: 'user-1', email: 'a@b.com', isGuest: false },
    rememberMe: true,
    lastActivityAt: Date.now(),
    now: Date.now(),
    platform: 'web',
    ...partial,
  };
}

describe('buildPostLogoutHref', () => {
  it('routes explicit logout to sign-in without return path', () => {
    assert.equal(buildPostLogoutHref(), POST_LOGOUT_SIGNIN_ROUTE);
    assert.equal(POST_LOGOUT_SIGNIN_ROUTE, '/onboarding/signin');
  });

  it('includes returnTo when session recovery should restore the app', () => {
    assert.equal(
      buildPostLogoutHref({ returnTo: '/(tabs)' }),
      '/onboarding/signin?returnTo=%2F(tabs)'
    );
  });
});

describe('resolveInitialRoute', () => {
  it('sends first-time visitors to onboarding', () => {
    const result = resolveInitialRoute(
      ctx({
        onboardingComplete: false,
        hasSupabaseSession: false,
        storedUser: null,
      })
    );
    assert.equal(result.href, '/onboarding');
    assert.equal(result.reason, 'onboarding_incomplete');
  });

  it('skips onboarding when a Supabase session already exists', () => {
    const result = resolveInitialRoute(
      ctx({
        onboardingComplete: false,
        hasSupabaseSession: true,
      })
    );
    assert.equal(result.href, '/(tabs)');
    assert.equal(result.reason, 'dashboard');
  });

  it('routes returning guests to the dashboard home tab on native', () => {
    const result = resolveInitialRoute(
      ctx({
        platform: 'native',
        storedUser: { id: 'guest-1', isGuest: true },
        hasSupabaseSession: false,
      })
    );
    assert.equal(result.href, '/(tabs)');
    assert.equal(result.reason, 'dashboard');
  });

  it('routes returning guests to the dashboard on web when onboarding is complete', () => {
    const result = resolveInitialRoute(
      ctx({
        platform: 'web',
        storedUser: { id: 'guest-1', isGuest: true },
        hasSupabaseSession: false,
        onboardingComplete: true,
      })
    );
    assert.equal(result.href, '/(tabs)');
    assert.equal(result.reason, 'dashboard');
  });

  it('redirects expired auth users to sign-in with return path', () => {
    const result = resolveInitialRoute(
      ctx({
        hasSupabaseSession: false,
        storedUser: { id: 'user-1', email: 'a@b.com', isGuest: false },
      })
    );
    assert.equal(result.href, '/onboarding/signin?returnTo=%2F(tabs)');
    assert.equal(result.reason, 'session_expired');
  });

  it('redirects idle web sessions without remember-me to sign-in', () => {
    const now = Date.now();
    const result = resolveInitialRoute(
      ctx({
        rememberMe: false,
        lastActivityAt: now - WEB_IDLE_TIMEOUT_MS - 1,
        now,
      })
    );
    assert.equal(result.href, '/onboarding/signin?returnTo=%2F(tabs)');
    assert.equal(result.reason, 'idle_timeout');
    assert.equal(result.requiresSignOut, true);
  });
});

describe('shouldPromptLogin', () => {
  it('returns null for guest users', () => {
    assert.equal(
      shouldPromptLogin(
        ctx({
          hasSupabaseSession: false,
          storedUser: { id: 'guest-1', isGuest: true },
        })
      ),
      null
    );
  });

  it('returns idle_timeout when remember-me is off and idle limit exceeded', () => {
    const now = Date.now();
    assert.equal(
      shouldPromptLogin(
        ctx({
          rememberMe: false,
          lastActivityAt: now - WEB_IDLE_TIMEOUT_MS - 1000,
          now,
        })
      ),
      'idle_timeout'
    );
  });

  it('returns session_expired when auth user has no session', () => {
    assert.equal(
      shouldPromptLogin(
        ctx({
          hasSupabaseSession: false,
          storedUser: { id: 'user-1', email: 'a@b.com', isGuest: false },
        })
      ),
      'session_expired'
    );
  });
});

describe('isIdleTimedOut', () => {
  it('does not time out on native', () => {
    assert.equal(
      isIdleTimedOut(
        ctx({
          platform: 'native',
          rememberMe: false,
          lastActivityAt: 0,
        })
      ),
      false
    );
  });

  it('does not time out when remember-me is enabled', () => {
    const now = Date.now();
    assert.equal(
      isIdleTimedOut(
        ctx({
          rememberMe: true,
          lastActivityAt: now - WEB_IDLE_TIMEOUT_MS * 2,
          now,
        })
      ),
      false
    );
  });
});

describe('needsReauthentication', () => {
  it('does not require auth for incomplete onboarding', () => {
    assert.equal(
      needsReauthentication(
        ctx({
          onboardingComplete: false,
          hasSupabaseSession: false,
          storedUser: null,
        })
      ),
      false
    );
  });
});
