import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isOnboardingTryRoute,
  shouldBlockOnboardingRedirect,
} from '@/src/services/onboardingRoutingLogic';

describe('isOnboardingTryRoute', () => {
  it('matches scan, receipt, pantry, and list routes', () => {
    assert.equal(isOnboardingTryRoute('/(tabs)/scan'), true);
    assert.equal(isOnboardingTryRoute('/receipt/preview'), true);
    assert.equal(isOnboardingTryRoute('/receipt/edit'), true);
    assert.equal(isOnboardingTryRoute('/pantry'), true);
    assert.equal(isOnboardingTryRoute('/list/abc'), true);
    assert.equal(isOnboardingTryRoute('/(tabs)'), false);
    assert.equal(isOnboardingTryRoute('/onboarding'), false);
  });
});

describe('shouldBlockOnboardingRedirect', () => {
  it('allows try routes when onboarding try is in progress', () => {
    assert.equal(
      shouldBlockOnboardingRedirect(false, true, '/(tabs)/scan', false, false),
      true
    );
  });

  it('blocks app routes when onboarding is incomplete and try is not active', () => {
    assert.equal(
      shouldBlockOnboardingRedirect(false, false, '/(tabs)', false, false),
      false
    );
  });
});
