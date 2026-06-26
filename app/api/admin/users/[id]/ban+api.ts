import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  banUser,
  requireAdmin,
} from '@/src/services/admin/admin.server';
import { isSupabaseAdminConfigured } from '@/src/services/stripe/stripeSupabase.server';

export async function POST(request: Request, { id }: { id: string }): Promise<Response> {
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

    let body: { reason?: string } = {};
    try {
      body = await request.json();
    } catch {
      // reason is optional
    }

    const profile = await banUser({
      actorId: ctx.actor.id,
      targetUserId: id,
      reason: body.reason ?? '',
    });

    return Response.json({ success: true, profile });
  } catch (error) {
    console.warn('[admin/users/:id/ban] failed:', error);
    const message = error instanceof Error ? error.message : 'Could not ban user.';
    return Response.json({ error: message }, { status: 502 });
  }
}
