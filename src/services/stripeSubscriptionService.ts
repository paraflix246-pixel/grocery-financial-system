import { Platform } from 'react-native';

import { getSession } from '@/src/services/authService';
import { resolveAppApiUrl } from '@/src/utils/appOrigin';
import {
  mapStripeStatusToSubscriptionState,
  type StripeSubscriptionStatus,
} from '@/src/services/stripe/stripeSubscriptionMapper';
import type { SubscriptionPlan } from '@/src/store/useSubscriptionStore';

export type { StripeSubscriptionStatus } from '@/src/services/stripe/stripeSubscriptionMapper';
export { mapStripeStatusToSubscriptionState } from '@/src/services/stripe/stripeSubscriptionMapper';

export const SUBSCRIPTION_AUTH_REQUIRED_ERROR = 'Sign in to manage your subscription.';

function resolveStripeApiUrl(path: string): string | null {
  if (Platform.OS !== 'web') return null;
  return resolveAppApiUrl(path);
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error(SUBSCRIPTION_AUTH_REQUIRED_ERROR);
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/** True when web billing can call Stripe API routes (same-origin or EXPO_PUBLIC_APP_URL). */
export function isStripeWebClientAvailable(): boolean {
  return Platform.OS === 'web' && resolveStripeApiUrl('/api/stripe/subscription-status') != null;
}

export async function fetchStripeSubscriptionStatus(): Promise<StripeSubscriptionStatus | null> {
  const apiUrl = resolveStripeApiUrl('/api/stripe/subscription-status');
  if (!apiUrl) return null;

  try {
    const headers = await authHeaders();
    const response = await fetch(apiUrl, { headers });
    if (response.status === 401) return { configured: true, subscription: null };
    if (!response.ok) return null;
    return (await response.json()) as StripeSubscriptionStatus;
  } catch {
    return null;
  }
}

export async function redirectToStripeCheckout(
  plan: SubscriptionPlan,
  product: 'pro' | 'family' = 'pro'
): Promise<void> {
  const apiUrl = resolveStripeApiUrl('/api/stripe/create-checkout-session');
  if (!apiUrl) {
    throw new Error('Stripe checkout is only available on the web app.');
  }

  const headers = await authHeaders();
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ plan, product }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Could not start Stripe checkout.');
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url) {
    throw new Error('Stripe did not return a checkout URL.');
  }

  if (typeof window !== 'undefined') {
    window.location.assign(payload.url);
  }
}

export async function redirectToStripePortal(): Promise<void> {
  const apiUrl = resolveStripeApiUrl('/api/stripe/create-portal-session');
  if (!apiUrl) {
    throw new Error('Stripe billing portal is only available on the web app.');
  }

  const headers = await authHeaders();
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Could not open billing portal.');
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url) {
    throw new Error('Stripe did not return a portal URL.');
  }

  if (typeof window !== 'undefined') {
    window.location.assign(payload.url);
  }
}

export async function fetchStripeConfigured(): Promise<boolean> {
  const apiUrl = resolveStripeApiUrl('/api/stripe/subscription-status');
  if (!apiUrl) return false;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) return false;
    const payload = (await response.json()) as { configured?: boolean };
    return payload.configured === true;
  } catch {
    return false;
  }
}
