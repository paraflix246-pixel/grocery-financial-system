import type { SubscriptionPlan, SubscriptionState } from '@/src/store/useSubscriptionStore';

export type StripeSubscriptionStatus = {
  configured: boolean;
  subscription: {
    active: boolean;
    status: string;
    plan: SubscriptionPlan | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string;
  } | null;
};

export function mapStripeStatusToSubscriptionState(
  status: StripeSubscriptionStatus
): SubscriptionState | null {
  const sub = status.subscription;
  if (!sub?.active) return null;

  return {
    tier: 'pro',
    plan: sub.plan ?? 'monthly',
    expiresAt: sub.currentPeriodEnd,
    mockPurchaseToken: null,
    subscriptionSource: 'paid',
    trialStartedAt: null,
  };
}
