import type { Href } from 'expo-router';

import {
  resetOnboardingToWelcome,
  type OnboardingProgress,
} from '@/src/services/onboardingFlowState';

type WelcomeRouter = {
  replace: (href: Href) => void;
};

export async function navigateToOnboardingWelcome(
  router: WelcomeRouter,
  onProgressReset?: (progress: OnboardingProgress) => void
): Promise<void> {
  const progress = await resetOnboardingToWelcome();
  onProgressReset?.(progress);
  router.replace('/onboarding' as Href);
}
