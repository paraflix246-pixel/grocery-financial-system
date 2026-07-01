import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  getAdminAnalytics,
  profilesSchemaErrorResponse,
  requireAdmin,
} from '@/src/services/admin/admin.server';
import { isSupabaseAdminConfigured } from '@/src/services/stripe/stripeSupabase.server';

export async function GET(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  try {
    const ctx = await requireAdmin(request);
    if (!ctx) {
      const user = await import('@/src/services/stripe/stripeSupabase.server').then((m) =>
        m.getUserFromAuthHeader(request)
      );
      return user ? adminForbiddenResponse() : adminUnauthorizedResponse();
    }

    const stats = await getAdminAnalytics();
    return Response.json(stats);
  } catch (error) {
    console.warn('[admin/stats] failed:', error);
    const message = error instanceof Error ? error.message : 'Could not load admin stats.';
    return profilesSchemaErrorResponse(message);
  }
}
