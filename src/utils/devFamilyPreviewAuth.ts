import { Alert } from 'react-native';
import type { Href } from 'expo-router';

import { resolveAppUserId } from '@/src/services/authService';
import { DEV_FAMILY_WORKSPACE_ROUTE } from '@/src/services/devFamilyWorkspacePreview';

/** Guest or Supabase user id — required to create a local household for dev preview. */
export async function hasDevFamilyPreviewUser(): Promise<boolean> {
  const userId = await resolveAppUserId();
  return Boolean(userId);
}

export function buildDevFamilyPreviewSignInHref(returnPath: string = DEV_FAMILY_WORKSPACE_ROUTE): Href {
  return `/onboarding/signin?returnTo=${encodeURIComponent(returnPath)}` as Href;
}

type PromptSignInLabels = {
  title: string;
  message: string;
  cancel: string;
  signIn: string;
};

export function promptDevFamilyPreviewSignIn(
  returnPath: string,
  labels: PromptSignInLabels,
  navigate: (href: Href) => void
): void {
  const href = buildDevFamilyPreviewSignInHref(returnPath);
  Alert.alert(labels.title, labels.message, [
    { text: labels.cancel, style: 'cancel' },
    { text: labels.signIn, onPress: () => navigate(href) },
  ]);
}
