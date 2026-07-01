import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  listProfiles,
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
    const search = url.searchParams.get('search') ?? undefined;
    const page = url.searchParams.get('page') ? Number.parseInt(url.searchParams.get('page')!, 10) : 1;
    const limit = url.searchParams.get('limit') ? Number.parseInt(url.searchParams.get('limit')!, 10) : 25;
    const tier = url.searchParams.get('tier') ?? undefined;
    const role = url.searchParams.get('role') ?? undefined;
    const banned = url.searchParams.get('banned') ?? undefined;
    const sortBy = url.searchParams.get('sortBy') ?? undefined;
    const sortDir = url.searchParams.get('sortDir') ?? undefined;
    const locale = url.searchParams.get('locale') ?? undefined;

    const result = await listProfiles({
      search,
      page,
      limit,
      tier: tier as 'all' | 'free' | 'pro' | 'family' | 'premium' | undefined,
      role: role as 'all' | 'admin' | 'user' | undefined,
      banned: banned as 'all' | 'banned' | 'active' | undefined,
      sortBy: sortBy as 'created_at' | 'last_seen_at' | 'email' | undefined,
      sortDir: sortDir as 'asc' | 'desc' | undefined,
      locale: locale as 'all' | 'en' | 'es' | undefined,
    });
    return Response.json(result);
  } catch (error) {
    console.warn('[admin/users] list failed:', error);
    const message = error instanceof Error ? error.message : 'Could not list users.';
    return Response.json({ error: message }, { status: 502 });
  }
}
