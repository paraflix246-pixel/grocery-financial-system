import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import {
  hasCompletedJoinHouseholdStep,
  markJoinHouseholdStepCompleted,
  resetJoinHouseholdStepForTests,
} from '@/src/services/onboardingJoinStepSession';

describe('onboarding join-household step session state', () => {
  beforeEach(() => {
    resetJoinHouseholdStepForTests();
  });

  it('starts incomplete and marks complete after skip or join', () => {
    assert.equal(hasCompletedJoinHouseholdStep(), false);
    markJoinHouseholdStepCompleted();
    assert.equal(hasCompletedJoinHouseholdStep(), true);
  });
});
