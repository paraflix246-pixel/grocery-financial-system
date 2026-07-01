import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  exportAdminCsv,
  requireAdmin,
} from '@/src/services/admin/admin.server';
import { isSupabaseAdminConfigured } from '@/src/services/stripe/stripeSupabase.server';

const EXPORT_TYPES = new Set(['users', 'subscriptions', 'feedback', 'receipts']);

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
    const type = url.searchParams.get('type')?.trim() ?? '';
    if (!EXPORT_TYPES.has(type)) {
      return Response.json(
        { error: 'Invalid export type. Use users, subscriptions, feedback, or receipts.' },
        { status: 400 }
      );
    }

    const csv = await exportAdminCsv(type as 'users' | 'subscriptions' | 'feedback' | 'receipts');
    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="penny-pantry-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.warn('[admin/export] failed:', error);
    const message = error instanceof Error ? error.message : 'Could not export data.';
    return Response.json({ error: message }, { status: 502 });
  }
}
