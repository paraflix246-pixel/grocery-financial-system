import {
  createPortalSessionForUser,
  isStripeBackendReady,
  requireAuthenticatedUser,
  stripeNotConfiguredResponse,
  stripeUnauthorizedResponse,
} from '@/src/services/stripe/stripeBilling.server';

export async function POST(request: Request): Promise<Response> {
  if (!isStripeBackendReady()) {
    return stripeNotConfiguredResponse();
  }

  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return stripeUnauthorizedResponse();
  }

  try {
    const { url } = await createPortalSessionForUser(user.id);
    return Response.json({ url });
  } catch (error) {
    console.warn('[stripe] create portal failed:', error);
    const message = error instanceof Error ? error.message : 'Could not open billing portal.';
    const status = /no stripe billing account/i.test(message) ? 404 : 502;
    return Response.json({ error: message }, { status });
  }
}
