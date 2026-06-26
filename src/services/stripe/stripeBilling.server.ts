import type Stripe from 'stripe';

import {
  getAppBaseUrl,
  getStripeClient,
  getStripePriceId,
  isStripeConfigured,
  isStripeSubscriptionActive,
  planFromStripeSubscription,
  stripePeriodEndIso,
} from '@/src/services/stripe/stripe.server';
import {
  createWorkspaceForOwner,
  getStripeSubscriptionForUser,
  getUserFromAuthHeader,
  getWorkspaceByStripeSubscriptionId,
  getWorkspaceForOwner,
  isSupabaseAdminConfigured,
  upsertStripeSubscription,
  upsertWorkspaceStripeSubscription,
} from '@/src/services/stripe/stripeSupabase.server';
import type { SubscriptionPlan } from '@/src/store/useSubscriptionStore';

export type CheckoutProduct = 'pro' | 'family';

export async function createCheckoutSessionForUser(
  userId: string,
  email: string | undefined,
  plan: SubscriptionPlan,
  product: CheckoutProduct = 'pro'
): Promise<{ url: string }> {
  const stripe = getStripeClient();
  const priceId = getStripePriceId(plan, product === 'family' ? 'family' : 'pro');
  const baseUrl = getAppBaseUrl();

  let workspaceId: string | undefined;
  if (product === 'family') {
    const existingWorkspace = await getWorkspaceForOwner(userId);
    workspaceId = existingWorkspace?.id ?? (await createWorkspaceForOwner(userId));
  }

  const existing = await getStripeSubscriptionForUser(userId);
  const metadata: Record<string, string> = {
    user_id: userId,
    plan,
    type: product,
  };
  if (workspaceId) metadata.workspace_id = workspaceId;

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/subscriptions?stripe=success&type=${product}`,
    cancel_url: `${baseUrl}/paywall?stripe=cancel`,
    client_reference_id: userId,
    metadata,
    subscription_data: {
      metadata,
    },
    allow_promotion_codes: true,
  };

  if (existing?.stripe_customer_id) {
    sessionParams.customer = existing.stripe_customer_id;
  } else if (email) {
    sessionParams.customer_email = email;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL.');
  }

  return { url: session.url };
}

export async function createPortalSessionForUser(userId: string): Promise<{ url: string }> {
  const stripe = getStripeClient();
  const existing = await getStripeSubscriptionForUser(userId);
  if (!existing?.stripe_customer_id) {
    throw new Error('No Stripe billing account found for this user.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: existing.stripe_customer_id,
    return_url: `${getAppBaseUrl()}/subscriptions`,
  });

  return { url: session.url };
}

export async function syncSubscriptionFromStripeObject(
  subscription: Stripe.Subscription,
  userIdHint?: string
): Promise<void> {
  const subscriptionType = subscription.metadata?.type?.trim() || 'pro';
  const workspaceId = subscription.metadata?.workspace_id?.trim();

  if (subscriptionType === 'workspace' || subscriptionType === 'family') {
    const targetWorkspaceId =
      workspaceId ||
      (await getWorkspaceByStripeSubscriptionId(subscription.id))?.id ||
      undefined;
    if (targetWorkspaceId) {
      await upsertWorkspaceStripeSubscription({
        workspaceId: targetWorkspaceId,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        plan: planFromStripeSubscription(subscription),
        currentPeriodEnd: stripePeriodEndIso(subscription),
      });
      return;
    }
  }

  const userId =
    userIdHint ||
    subscription.metadata?.user_id?.trim() ||
    subscription.metadata?.userId?.trim();
  if (!userId) {
    console.warn('[stripe] subscription update missing user_id metadata:', subscription.id);
    return;
  }

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return;

  await upsertStripeSubscription({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    plan: planFromStripeSubscription(subscription),
    currentPeriodEnd: stripePeriodEndIso(subscription),
  });
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.user_id?.trim() || session.client_reference_id?.trim();
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!userId || !customerId) {
    console.warn('[stripe] checkout.session.completed missing user or customer');
    return;
  }

  const checkoutType = session.metadata?.type?.trim() || 'pro';
  const workspaceId = session.metadata?.workspace_id?.trim();

  if ((checkoutType === 'family' || checkoutType === 'workspace') && workspaceId && subscriptionId) {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await upsertWorkspaceStripeSubscription({
      workspaceId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      plan: planFromStripeSubscription(subscription),
      currentPeriodEnd: stripePeriodEndIso(subscription),
    });
    return;
  }

  if (subscriptionId) {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscriptionFromStripeObject(subscription, userId);
    return;
  }

  await upsertStripeSubscription({
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId ?? null,
    status: 'active',
    plan:
      session.metadata?.plan === 'monthly' || session.metadata?.plan === 'yearly'
        ? session.metadata.plan
        : null,
    currentPeriodEnd: null,
  });
}

export function stripeStatusResponse(
  configured: boolean,
  row: Awaited<ReturnType<typeof getStripeSubscriptionForUser>> | null = null
) {
  const active = row ? isStripeSubscriptionActive(row.status) : false;
  return {
    configured,
    subscription: row
      ? {
          active,
          status: row.status,
          plan: row.plan,
          currentPeriodEnd: row.current_period_end,
          stripeCustomerId: row.stripe_customer_id,
        }
      : null,
  };
}

export function stripeNotConfiguredResponse(): Response {
  return Response.json({ error: 'Stripe is not configured on the server.' }, { status: 503 });
}

export function stripeUnauthorizedResponse(): Response {
  return Response.json({ error: 'Sign in required for billing.' }, { status: 401 });
}

export function isStripeBackendReady(): boolean {
  return isStripeConfigured() && isSupabaseAdminConfigured();
}

export async function requireAuthenticatedUser(request: Request) {
  const user = await getUserFromAuthHeader(request);
  if (!user) return null;
  return user;
}
