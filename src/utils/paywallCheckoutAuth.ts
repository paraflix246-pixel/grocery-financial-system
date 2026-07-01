import { Alert } from 'react-native';
import type { Href } from 'expo-router';

import { getSession } from '@/src/services/authService';
import { SUBSCRIPTION_AUTH_REQUIRED_ERROR } from '@/src/services/stripeSubscriptionService';
import { buildPaywallHref, type PaywallPlanId } from '@/src/utils/paywallRoutes';

export type CheckoutProduct = 'pro' | 'family';

export async function hasActiveCheckoutSession(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session?.access_token);
}

export function isSubscriptionAuthError(error: unknown): boolean {
  return error instanceof Error && error.message === SUBSCRIPTION_AUTH_REQUIRED_ERROR;
}

type PromptSignInLabels = {
  title: string;
  message: string;
  cancel: string;
  signIn: string;
};

export function promptPaywallSignIn(
  product: CheckoutProduct,
  labels: PromptSignInLabels,
  navigate: (href: Href) => void
): void {
  const returnPlan: PaywallPlanId = product;
  const returnPath = buildPaywallHref(returnPlan);
  const href = `/onboarding/signin?returnTo=${encodeURIComponent(returnPath)}` as Href;
  Alert.alert(labels.title, labels.message, [
    { text: labels.cancel, style: 'cancel' },
    { text: labels.signIn, onPress: () => navigate(href) },
  ]);
}
