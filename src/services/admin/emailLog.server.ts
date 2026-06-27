import { getSupabaseAdmin } from '@/src/services/stripe/stripeSupabase.server';

export type EmailLogType =
  | 'welcome'
  | 'password_reset'
  | 're_engagement'
  | 'password_changed'
  | 'email_changed'
  | 'other';

export async function logEmailEvent(input: {
  userId?: string | null;
  email?: string | null;
  emailType: EmailLogType;
  status?: 'sent' | 'failed' | 'skipped';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('email_log').insert({
    user_id: input.userId ?? null,
    email: input.email ?? null,
    email_type: input.emailType,
    status: input.status ?? 'sent',
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.warn('[email_log] insert failed:', error.message);
  }
}
