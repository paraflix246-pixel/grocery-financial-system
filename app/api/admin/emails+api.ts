import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  listEmailLog,
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
      const { getUserFromAuthHeader } = await import('@/src/services/stripe/stripeSupabase.server');
      const user = await getUserFromAuthHeader(request);
      return user ? adminForbiddenResponse() : adminUnauthorizedResponse();
    }

    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') ? Number.parseInt(url.searchParams.get('limit')!, 10) : 50;
    const emails = await listEmailLog(limit);
    return Response.json({ emails });
  } catch (error) {
    console.warn('[admin/emails] failed:', error);
    const message = error instanceof Error ? error.message : 'Could not load email log.';
    return Response.json({ error: message }, { status: 502 });
  }
}
