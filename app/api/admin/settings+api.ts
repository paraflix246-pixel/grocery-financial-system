import {
  adminForbiddenResponse,
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  getPlatformSettings,
  requireAdmin,
  updatePlatformSettings,
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

    const settings = await getPlatformSettings();
    return Response.json(settings);
  } catch (error) {
    console.warn('[admin/settings] read failed:', error);
    const message = error instanceof Error ? error.message : 'Could not load settings.';
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request): Promise<Response> {
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
      maintenanceMode?: boolean;
      maintenanceMessage?: string;
      featureFlags?: Record<string, unknown>;
    } | null;

    const settings = await updatePlatformSettings({
      actorId: ctx.actor.id,
      maintenanceMode: body?.maintenanceMode,
      maintenanceMessage: body?.maintenanceMessage,
      featureFlags: body?.featureFlags,
    });

    return Response.json(settings);
  } catch (error) {
    console.warn('[admin/settings] update failed:', error);
    const message = error instanceof Error ? error.message : 'Could not update settings.';
    return Response.json({ error: message }, { status: 502 });
  }
}
