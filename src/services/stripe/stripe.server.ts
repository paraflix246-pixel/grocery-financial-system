import Stripe from 'stripe';

import type { SubscriptionPlan } from '@/src/store/useSubscriptionStore';

export type StripeSubscriptionRow = {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  status: string;
  plan: SubscriptionPlan | null;
  current_period_end: string | null;
};

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

let stripeClient: Stripe | null | undefined;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeClient(): Stripe {
  if (stripeClient !== undefined) return stripeClient as Stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2026-06-24.dahlia',
    typescript: true,
  });
  return stripeClient;
}

export function getStripePriceId(plan: SubscriptionPlan, product: 'pro' | 'family' = 'pro'): string {
  const monthly =
    product === 'family'
      ? process.env.STRIPE_PRICE_FAMILY_MONTHLY?.trim() || process.env.STRIPE_PRICE_PRO_MONTHLY?.trim()
      : process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  const yearly =
    product === 'family'
      ? process.env.STRIPE_PRICE_FAMILY_YEARLY?.trim() || process.env.STRIPE_PRICE_PRO_YEARLY?.trim()
      : process.env.STRIPE_PRICE_PRO_YEARLY?.trim();
  const priceId = plan === 'yearly' ? yearly : monthly;
  if (!priceId) {
    const label = product === 'family' ? 'Family' : 'Pro';
    throw new Error(
      plan === 'yearly'
        ? `STRIPE_PRICE_${product === 'family' ? 'FAMILY' : 'PRO'}_YEARLY is not configured.`
        : `STRIPE_PRICE_${product === 'family' ? 'FAMILY' : 'PRO'}_MONTHLY is not configured.`
    );
  }
  return priceId;
}

export function getAppBaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') ||
    'https://pennypantry.xyz'
  );
}

export function planFromStripePriceId(priceId: string | null | undefined): SubscriptionPlan | null {
  if (!priceId) return null;
  const monthly = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  const yearly = process.env.STRIPE_PRICE_PRO_YEARLY?.trim();
  if (yearly && priceId === yearly) return 'yearly';
  if (monthly && priceId === monthly) return 'monthly';
  if (/year|annual/i.test(priceId)) return 'yearly';
  return 'monthly';
}

export function planFromStripeSubscription(subscription: Stripe.Subscription): SubscriptionPlan | null {
  const metadataPlan = subscription.metadata?.plan?.trim();
  if (metadataPlan === 'monthly' || metadataPlan === 'yearly') {
    return metadataPlan;
  }
  const priceId = subscription.items.data[0]?.price?.id;
  return planFromStripePriceId(priceId);
}

export function isStripeSubscriptionActive(status: string | null | undefined): boolean {
  return Boolean(status && ACTIVE_STATUSES.has(status));
}

export function stripePeriodEndIso(subscription: Stripe.Subscription): string | null {
  const end =
    subscription.items.data[0]?.current_period_end ??
    (subscription as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  if (typeof end !== 'number' || end <= 0) return null;
  return new Date(end * 1000).toISOString();
}
