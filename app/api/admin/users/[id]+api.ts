import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  getProfileDetail,
  requireAdmin,
} from '@/src/services/admin/admin.server';
import { isSupabaseAdminConfigured } from '@/src/services/stripe/stripeSupabase.server';

export async function GET(request: Request, { id }: { id: string }): Promise<Response> {
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

    const detail = await getProfileDetail(id);
    const lastSignIn = detail.authUser?.last_sign_in_at ?? null;
    const providers = detail.authUser?.app_metadata?.providers ?? detail.authUser?.app_metadata?.provider ?? null;

    return Response.json({
      profile: detail.profile,
      lastSignIn,
      providers,
      userMetadata: detail.authUser?.user_metadata ?? {},
      auditEvents: detail.auditEvents,
    });
  } catch (error) {
    console.warn('[admin/users/:id] detail failed:', error);
    const message = error instanceof Error ? error.message : 'Could not load user.';
    const status = message === 'User not found.' ? 404 : 502;
    return Response.json({ error: message }, { status });
  }
}
