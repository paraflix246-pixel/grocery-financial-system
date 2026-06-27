import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  requireAdmin,
  sendReEngagementEmail,
} from '@/src/services/admin/admin.server';
import { isSupabaseAdminConfigured } from '@/src/services/stripe/stripeSupabase.server';

export async function POST(request: Request): Promise<Response> {
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

    const body = (await request.json().catch(() => null)) as { userId?: string } | null;
    const userId = body?.userId?.trim();
    if (!userId) {
      return Response.json({ error: 'userId is required.' }, { status: 400 });
    }

    await sendReEngagementEmail({ actorId: ctx.actor.id, targetUserId: userId });
    return Response.json({ success: true });
  } catch (error) {
    console.warn('[admin/re-engage] failed:', error);
    const message = error instanceof Error ? error.message : 'Could not send re-engagement email.';
    return Response.json({ error: message }, { status: 502 });
  }
}
