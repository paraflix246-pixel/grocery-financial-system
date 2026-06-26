import {
  getSupabaseAdmin,
  getUserFromAuthHeader,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';

export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return Response.json({ error: 'Account deletion is not configured on the server.' }, { status: 503 });
  }

  const user = await getUserFromAuthHeader(request);
  if (!user) {
    return Response.json({ error: 'Sign in required to delete your account.' }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.warn('[account] delete user failed:', error.message);
      return Response.json({ error: 'Could not delete your account. Please contact support.' }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.warn('[account] delete user error:', error);
    return Response.json({ error: 'Could not delete your account.' }, { status: 502 });
  }
}
