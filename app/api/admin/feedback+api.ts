import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  listUserFeedback,
  requireAdmin,
  updateFeedbackStatus,
} from '@/src/services/admin/admin.server';
import { isSupabaseAdminConfigured } from '@/src/services/stripe/stripeSupabase.server';

export async function GET(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  try {
    const ctx = await requireAdmin(request);
    if (!ctx) {
      const { getUserFromAuthHeader } = await import('@/src/services/stripe/stripeSupabase.server');
      const user = await getUserFromAuthHeader(request);
      return user ? adminForbiddenResponse() : adminUnauthorizedResponse();
    }

    const feedback = await listUserFeedback();
    return Response.json({ feedback });
  } catch (error) {
    console.warn('[admin/feedback] list failed:', error);
    const message = error instanceof Error ? error.message : 'Could not load feedback.';
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  try {
    const ctx = await requireAdmin(request);
    if (!ctx) {
      const { getUserFromAuthHeader } = await import('@/src/services/stripe/stripeSupabase.server');
      const user = await getUserFromAuthHeader(request);
      return user ? adminForbiddenResponse() : adminUnauthorizedResponse();
    }

    const body = (await request.json().catch(() => null)) as {
      id?: string;
      status?: 'open' | 'reviewed' | 'resolved';
    } | null;

    if (!body?.id || !body.status) {
      return Response.json({ error: 'id and status are required.' }, { status: 400 });
    }

    const feedback = await updateFeedbackStatus({
      actorId: ctx.actor.id,
      feedbackId: body.id,
      status: body.status,
    });

    return Response.json({ feedback });
  } catch (error) {
    console.warn('[admin/feedback] update failed:', error);
    const message = error instanceof Error ? error.message : 'Could not update feedback.';
    return Response.json({ error: message }, { status: 502 });
  }
}
