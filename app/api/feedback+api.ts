import { submitUserFeedback } from '@/src/services/admin/admin.server';
import {
  getUserFromAuthHeader,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';

export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return Response.json({ error: 'Feedback is not configured on the server.' }, { status: 503 });
  }

  const user = await getUserFromAuthHeader(request);
  const body = (await request.json().catch(() => null)) as {
    message?: string;
    category?: string;
    email?: string;
  } | null;

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return Response.json({ error: 'Message is required.' }, { status: 400 });
  }

  try {
    const feedback = await submitUserFeedback({
      userId: user?.id ?? null,
      email: user?.email ?? body?.email ?? null,
      message,
      category: body?.category,
    });
    return Response.json({ success: true, feedback });
  } catch (error) {
    console.warn('[feedback] submit failed:', error);
    const errMsg = error instanceof Error ? error.message : 'Could not submit feedback.';
    return Response.json({ error: errMsg }, { status: 502 });
  }
}
