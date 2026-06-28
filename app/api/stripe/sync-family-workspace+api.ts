import {
  isStripeBackendReady,
  requireAuthenticatedUser,
  stripeNotConfiguredResponse,
  stripeUnauthorizedResponse,
  syncFamilyWorkspaceForUser,
} from '@/src/services/stripe/stripeBilling.server';

export async function POST(request: Request): Promise<Response> {
  if (!isStripeBackendReady()) {
    return stripeNotConfiguredResponse();
  }

  const user = await requireAuthenticatedUser(request);
  if (!user) {
    return stripeUnauthorizedResponse();
  }

  let checkoutSessionId: string | undefined;
  try {
    const body = (await request.json()) as { sessionId?: string };
    checkoutSessionId = body.sessionId?.trim() || undefined;
  } catch {
    checkoutSessionId = undefined;
  }

  try {
    const result = await syncFamilyWorkspaceForUser(user.id, checkoutSessionId);
    if (!result) {
      return Response.json({ error: 'Could not provision household workspace.' }, { status: 404 });
    }
    return Response.json(result);
  } catch (error) {
    console.warn('[stripe] sync family workspace failed:', error);
    const message = error instanceof Error ? error.message : 'Could not sync household workspace.';
    return Response.json({ error: message }, { status: 502 });
  }
}
