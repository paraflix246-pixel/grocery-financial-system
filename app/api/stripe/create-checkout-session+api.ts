import {
  createCheckoutSessionForUser,
  isStripeBackendReady,
  requireAuthenticatedUser,
  stripeNotConfiguredResponse,
  stripeUnauthorizedResponse,
} from '@/src/services/stripe/stripeBilling.server';
import type { SubscriptionPlan } from '@/src/store/useSubscriptionStore';

export async function POST(request: Request): Promise<Response> {
  if (!isStripeBackendReady()) {
    return stripeNotConfiguredResponse();
  }

  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return stripeUnauthorizedResponse();
  }

  let body: { plan?: SubscriptionPlan; product?: 'pro' | 'family' };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== 'monthly' && plan !== 'yearly') {
    return Response.json({ error: 'plan must be "monthly" or "yearly"' }, { status: 400 });
  }

  const product = body.product === 'family' ? 'family' : 'pro';

  try {
    const { url } = await createCheckoutSessionForUser(user.id, user.email, plan, product);
    return Response.json({ url });
  } catch (error) {
    console.warn('[stripe] create checkout failed:', error);
    const message = error instanceof Error ? error.message : 'Could not start checkout.';
    return Response.json({ error: message }, { status: 502 });
  }
}
