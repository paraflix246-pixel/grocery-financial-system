import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  listAuditEvents,
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
    const page = url.searchParams.get('page') ? Number.parseInt(url.searchParams.get('page')!, 10) : 1;
    const limit = url.searchParams.get('limit') ? Number.parseInt(url.searchParams.get('limit')!, 10) : 30;
    const eventType = url.searchParams.get('eventType') ?? undefined;

    const result = await listAuditEvents({ page, limit, eventType });
    return Response.json(result);
  } catch (error) {
    console.warn('[admin/activity] failed:', error);
    const message = error instanceof Error ? error.message : 'Could not load activity.';
    return Response.json({ error: message }, { status: 502 });
  }
}
