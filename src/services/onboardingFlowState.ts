import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  hasCompletedJoinHouseholdStep,
  markJoinHouseholdStepCompleted,
} from '@/src/services/onboardingJoinStepSession';
import { listWorkspacesForUser } from '@/src/services/workspaceService';

export {
  hasCompletedJoinHouseholdStep,
  markJoinHouseholdStepCompleted,
  resetJoinHouseholdStepForTests,
} from '@/src/services/onboardingJoinStepSession';

export {
  completeOnboardingTry,
  DEFAULT_ONBOARDING_PROGRESS,
  finishOnboardingTryAndReturn,
  isOnboardingTryInProgressSync,
  loadOnboardingProgress,
  markOnboardingTryStarted,
  ONBOARDING_STEP_COUNT,
  resetOnboardingProgressForTests,
  resetOnboardingToWelcome,
  saveOnboardingProgress,
  setOnboardingStep,
  skipOnboardingTryWithoutData,
  toggleOnboardingGoal,
  type OnboardingFirstAction,
  type OnboardingGoal,
  type OnboardingProgress,
  type OnboardingStep,
} from '@/src/services/onboardingProgressState';

const OAUTH_INTENT_KEY = '@pennypantry_oauth_intent_v1';
const OAUTH_RETURN_TO_KEY = '@pennypantry_oauth_return_to_v1';

export type OAuthIntent = 'signup' | 'signin';

export async function setOAuthIntent(intent: OAuthIntent): Promise<void> {
  await AsyncStorage.setItem(OAUTH_INTENT_KEY, intent);
}

export async function consumeOAuthIntent(): Promise<OAuthIntent | null> {
  const raw = await AsyncStorage.getItem(OAUTH_INTENT_KEY);
  await AsyncStorage.removeItem(OAUTH_INTENT_KEY);
  if (raw === 'signup' || raw === 'signin') return raw;
  return null;
}

export async function setOAuthReturnTo(returnTo: string): Promise<void> {
  const trimmed = returnTo.trim();
  if (!trimmed) {
    await AsyncStorage.removeItem(OAUTH_RETURN_TO_KEY);
    return;
  }
  await AsyncStorage.setItem(OAUTH_RETURN_TO_KEY, trimmed);
}

export async function consumeOAuthReturnTo(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(OAUTH_RETURN_TO_KEY);
  await AsyncStorage.removeItem(OAUTH_RETURN_TO_KEY);
  return raw?.trim() ? raw : null;
}

export async function userHasJoinedHousehold(userId: string): Promise<boolean> {
  const workspaces = await listWorkspacesForUser(userId);
  return workspaces.some((workspace) => workspace.ownerUserId !== userId);
}

export async function shouldShowPaywallFreeJoinFallback(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  if (hasCompletedJoinHouseholdStep()) return false;
  if (await userHasJoinedHousehold(userId)) return false;
  return true;
}
