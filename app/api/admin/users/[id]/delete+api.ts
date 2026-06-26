import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  deleteUserAsAdmin,
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

    await deleteUserAsAdmin({
      actorId: ctx.actor.id,
      targetUserId: id,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.warn('[admin/users/:id/delete] failed:', error);
    const message = error instanceof Error ? error.message : 'Could not delete user.';
    return Response.json({ error: message }, { status: 502 });
  }
}
