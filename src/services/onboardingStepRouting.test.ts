import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  completeOnboardingTry,
  DEFAULT_ONBOARDING_PROGRESS,
  resetOnboardingProgressForTests,
  skipOnboardingTryWithoutData,
} from '@/src/services/onboardingProgressState';
import {
  getPreviousOnboardingStep,
  getStepAfterTrySkip,
  resolveOnboardingStepOnLoad,
  shouldRenderAnalyzingStep,
} from '@/src/services/onboardingStepRouting';

describe('onboardingStepRouting', () => {
  beforeEach(() => {
    resetOnboardingProgressForTests();
  });

  it('routes try skip directly to value moment (step 5)', () => {
    assert.equal(getStepAfterTrySkip(), 5);
  });

  it('does not render analyzing when try was skipped without data', () => {
    assert.equal(
      shouldRenderAnalyzingStep({ skippedTryWithoutData: true, firstAction: null }),
      false
    );
  });

  it('renders analyzing when user completed try with data', () => {
    assert.equal(
      shouldRenderAnalyzingStep({ skippedTryWithoutData: false, firstAction: 'scan_receipt' }),
      true
    );
  });

  it('skips analyzing on back from value moment or stale analyzing step', () => {
    assert.equal(getPreviousOnboardingStep(5, DEFAULT_ONBOARDING_PROGRESS), 3);
    assert.equal(getPreviousOnboardingStep(4, DEFAULT_ONBOARDING_PROGRESS), 3);
    assert.equal(getPreviousOnboardingStep(6, DEFAULT_ONBOARDING_PROGRESS), 5);
  });

  it('corrects stored step 4 to step 5 when try was skipped', () => {
    assert.equal(
      resolveOnboardingStepOnLoad(4, {
        skippedTryWithoutData: true,
        firstAction: null,
      }),
      5
    );
    assert.equal(
      resolveOnboardingStepOnLoad(4, {
        skippedTryWithoutData: false,
        firstAction: 'add_manual',
      }),
      4
    );
  });
});

describe('skipOnboardingTryWithoutData', () => {
  beforeEach(() => {
    resetOnboardingProgressForTests();
  });

  it('marks skip and lands on value moment', async () => {
    const progress = await skipOnboardingTryWithoutData();
    assert.equal(progress.step, 5);
    assert.equal(progress.skippedTryWithoutData, true);
    assert.equal(progress.firstAction, null);
    assert.equal(progress.tryInProgress, false);
  });

  it('clears skip flag when user completes try with data', async () => {
    await skipOnboardingTryWithoutData();
    const progress = await completeOnboardingTry();
    assert.equal(progress.step, 4);
    assert.equal(progress.skippedTryWithoutData, false);
  });
});
