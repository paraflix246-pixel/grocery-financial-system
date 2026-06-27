import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  createAdminMessage,
  listAdminMessages,
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

    const messages = await listAdminMessages();
    return Response.json({ messages });
  } catch (error) {
    console.warn('[admin/messages] list failed:', error);
    const message = error instanceof Error ? error.message : 'Could not load messages.';
    return Response.json({ error: message }, { status: 502 });
  }
}

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

    const body = (await request.json().catch(() => null)) as {
      title?: string;
      body?: string;
      audience?: string;
      expiresAt?: string | null;
    } | null;

    const message = await createAdminMessage({
      actorId: ctx.actor.id,
      title: body?.title ?? '',
      body: body?.body ?? '',
      audience: body?.audience,
      expiresAt: body?.expiresAt,
    });

    return Response.json({ message });
  } catch (error) {
    console.warn('[admin/messages] create failed:', error);
    const message = error instanceof Error ? error.message : 'Could not create message.';
    return Response.json({ error: message }, { status: 502 });
  }
}
