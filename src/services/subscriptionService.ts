import type { SubscriptionPlan, SubscriptionState, SubscriptionTier } from '@/src/store/useSubscriptionStore';

export type PurchaseResult = {
  success: boolean;
  state: SubscriptionState;
  error?: string;
};

/** When true, purchases use local mock tokens instead of RevenueCat. */
export const SUBSCRIPTION_DEV_MOCK =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const DEFAULT_STATE: SubscriptionState = {
  tier: 'free',
  plan: null,
  expiresAt: null,
  mockPurchaseToken: null,
};

function buildMockPaidState(plan: SubscriptionPlan, tier: Exclude<SubscriptionTier, 'free'>): SubscriptionState {
  const expires = new Date();
  expires.setMonth(expires.getMonth() + (plan === 'yearly' ? 12 : 1));
  return {
    tier,
    plan,
    expiresAt: expires.toISOString(),
    mockPurchaseToken: `mock_${tier}_${Date.now()}`,
  };
}

/** RevenueCat-ready hook: replace body with Purchases.getCustomerInfo(). */
export async function loadSubscriptionFromProvider(): Promise<SubscriptionState | null> {
  return null;
}

export async function purchaseSubscription(
  plan: SubscriptionPlan,
  tier: Exclude<SubscriptionTier, 'free'> = 'pro'
): Promise<PurchaseResult> {
  if (SUBSCRIPTION_DEV_MOCK) {
    const state = buildMockPaidState(plan, tier);
    return { success: true, state };
  }
  return {
    success: false,
    state: DEFAULT_STATE,
    error: 'In-app purchases are not configured yet.',
  };
}

export async function restoreSubscriptionPurchases(): Promise<PurchaseResult> {
  if (SUBSCRIPTION_DEV_MOCK) {
    return { success: true, state: DEFAULT_STATE };
  }
  return {
    success: false,
    state: DEFAULT_STATE,
    error: 'Restore purchases is not configured yet.',
  };
}

export function isSubscriptionExpired(state: SubscriptionState): boolean {
  return Boolean(state.expiresAt && new Date(state.expiresAt) < new Date());
}
