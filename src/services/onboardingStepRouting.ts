import type { OnboardingProgress, OnboardingStep } from '@/src/services/onboardingProgressState';

export function getStepAfterTrySkip(): OnboardingStep {
  return 5;
}

export function getPreviousOnboardingStep(
  currentStep: OnboardingStep,
  progress: Pick<OnboardingProgress, 'skippedTryWithoutData'>
): OnboardingStep | null {
  if (currentStep <= 1) return null;
  if (currentStep === 4 || currentStep === 5) return 3;
  return (currentStep - 1) as OnboardingStep;
}

export function shouldRenderAnalyzingStep(
  progress: Pick<OnboardingProgress, 'skippedTryWithoutData' | 'firstAction'>
): boolean {
  return !progress.skippedTryWithoutData && progress.firstAction != null;
}

export function resolveOnboardingStepOnLoad(
  step: OnboardingStep,
  progress: Pick<OnboardingProgress, 'skippedTryWithoutData' | 'firstAction'>
): OnboardingStep {
  if (step === 4 && !shouldRenderAnalyzingStep(progress)) {
    return 5;
  }
  return step;
}
