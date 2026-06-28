import {
  adminNotConfiguredResponse,
  adminUnauthorizedResponse,
  upsertProfileFromAuthUser,
} from '@/src/services/admin/admin.server';
import {
  getUserFromAuthHeader,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';

export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return adminNotConfiguredResponse();
  }

  const user = await getUserFromAuthHeader(request);
  if (!user) {
    return adminUnauthorizedResponse();
  }

  try {
    const profile = await upsertProfileFromAuthUser(user);
    return Response.json({
      success: true,
      profile: {
        id: profile.id,
        role: profile.role,
        onboarding_completed_at: profile.onboarding_completed_at,
      },
    });
  } catch (error) {
    console.warn('[profile/sync] failed:', error);
    const message = error instanceof Error ? error.message : 'Could not sync profile.';
    return Response.json({ error: message }, { status: 502 });
  }
}
