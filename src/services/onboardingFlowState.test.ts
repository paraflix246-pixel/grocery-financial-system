import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  clampOnboardingStep,
  DEFAULT_ONBOARDING_PROGRESS,
  loadOnboardingProgress,
  markOnboardingTryStarted,
  parseOnboardingProgressRaw,
  resetOnboardingProgressForTests,
  resetOnboardingToWelcome,
  saveOnboardingProgress,
  toggleOnboardingGoal,
} from '@/src/services/onboardingProgressState';

describe('onboardingProgressState', () => {
  beforeEach(() => {
    resetOnboardingProgressForTests();
  });

  it('returns defaults when no progress is stored', async () => {
    const progress = await loadOnboardingProgress();
    assert.deepEqual(progress, DEFAULT_ONBOARDING_PROGRESS);
  });

  it('persists goals and step updates in memory', async () => {
    await saveOnboardingProgress({ step: 2 });
    await toggleOnboardingGoal('save_money');
    await toggleOnboardingGoal('reduce_waste');
    const progress = await loadOnboardingProgress();
    assert.equal(progress.step, 2);
    assert.deepEqual(progress.goals, ['save_money', 'reduce_waste']);
  });

  it('marks try in progress with first action', async () => {
    const progress = await markOnboardingTryStarted('scan_receipt');
    assert.equal(progress.firstAction, 'scan_receipt');
    assert.equal(progress.tryInProgress, true);
  });

  it('parses stored payloads safely', () => {
    assert.deepEqual(parseOnboardingProgressRaw(null), DEFAULT_ONBOARDING_PROGRESS);
    assert.equal(
      parseOnboardingProgressRaw({ step: 99, goals: ['save_money', 'invalid'] }).step,
      7
    );
  });

  it('clamps onboarding steps', () => {
    assert.equal(clampOnboardingStep(0), 1);
    assert.equal(clampOnboardingStep(8), 7);
  });

  it('resets progress to the welcome step', async () => {
    await saveOnboardingProgress({
      step: 5,
      goals: ['save_money'],
      tryInProgress: true,
      firstAction: 'scan_receipt',
    });
    const progress = await resetOnboardingToWelcome();
    assert.deepEqual(progress, DEFAULT_ONBOARDING_PROGRESS);
    assert.deepEqual(await loadOnboardingProgress(), DEFAULT_ONBOARDING_PROGRESS);
  });
});
