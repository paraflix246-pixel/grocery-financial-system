import {
  isStripeBackendReady,
  requireAuthenticatedUser,
  stripeStatusResponse,
  stripeUnauthorizedResponse,
} from '@/src/services/stripe/stripeBilling.server';
import { isStripeConfigured } from '@/src/services/stripe/stripe.server';
import {
  getStripeSubscriptionForUser,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';

export async function GET(request: Request): Promise<Response> {
  const configured = isStripeConfigured() && isSupabaseAdminConfigured();
  if (!configured) {
    return Response.json(stripeStatusResponse(false));
  }

  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return stripeUnauthorizedResponse();
  }

  if (!isStripeBackendReady()) {
    return Response.json(stripeStatusResponse(false));
  }

  try {
    const row = await getStripeSubscriptionForUser(user.id);
    return Response.json(stripeStatusResponse(true, row));
  } catch (error) {
    console.warn('[stripe] subscription status failed:', error);
    const message = error instanceof Error ? error.message : 'Could not load subscription status.';
    return Response.json({ error: message }, { status: 502 });
  }
}
