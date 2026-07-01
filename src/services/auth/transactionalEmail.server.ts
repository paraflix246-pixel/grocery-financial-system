import type { User } from '@supabase/supabase-js';

import { isEmailConfirmed } from '@/src/services/auth/emailConfirmationLogic';

import {
  buildEmailCard,
  buildEmailCta,
  buildEmailDocument,
  buildEmailHeader,
  buildEmailInnerFooter,
  buildEmailSupportFooter,
  buildPasswordChangedEmailHtml,
  buildEmailChangedAlertHtml,
} from '@/src/services/auth/emailBranding';
import {
  getTransactionalAppUrl,
  isResendConfigured,
  sendViaResend,
} from '@/src/services/auth/resendEmail.server';
import {
  getUserFromAuthHeader,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';

function logTransactionalEvent(
  kind: 'password-changed' | 'email-changed',
  outcome: 'skipped' | 'sent' | 'failed',
  detail: Record<string, unknown>
): void {
  const line = `[auth/${kind}] ${outcome}: ${JSON.stringify(detail)}`;
  if (outcome === 'sent') {
    console.info(line);
  } else {
    console.warn(line);
  }
}

export function isTransactionalEmailConfigured(): boolean {
  return isResendConfigured();
}

export function buildPasswordChangedEmailHtmlForApp(appUrl?: string): string {
  return buildPasswordChangedEmailHtml(appUrl ?? getTransactionalAppUrl());
}

export function buildEmailChangedAlertHtmlForApp(
  oldEmail: string,
  newEmail: string,
  appUrl?: string
): string {
  return buildEmailChangedAlertHtml(oldEmail, newEmail, appUrl ?? getTransactionalAppUrl());
}

export async function handlePasswordChangedNotificationRequest(
  request: Request
): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    logTransactionalEvent('password-changed', 'skipped', {
      reason: 'supabase_admin_not_configured',
      hint: 'Set SUPABASE_SERVICE_ROLE_KEY on Vercel.',
    });
    return Response.json(
      { error: 'Password notification is not configured on the server.' },
      { status: 503 }
    );
  }

  const user = await getUserFromAuthHeader(request);
  if (!user?.email) {
    return Response.json({ error: 'Sign in required.' }, { status: 401 });
  }

  if (!isResendConfigured()) {
    logTransactionalEvent('password-changed', 'skipped', {
      reason: 'resend_not_configured',
      hint: 'Set RESEND_API_KEY on Vercel.',
      userId: user.id,
      email: user.email,
    });
    return Response.json({ success: true, skipped: true, reason: 'resend_not_configured' });
  }

  const html = buildPasswordChangedEmailHtml(getTransactionalAppUrl());
  const from = process.env.WELCOME_FROM_EMAIL?.trim() || 'Penny Pantry <hello@pennypantry.xyz>';

  try {
    await sendViaResend(user.email, 'Your Penny Pantry password was updated', html);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logTransactionalEvent('password-changed', 'failed', {
      reason: 'resend_send_error',
      userId: user.id,
      email: user.email,
      from,
      error: message,
    });
    return Response.json({ error: 'Could not send password notification.' }, { status: 502 });
  }

  logTransactionalEvent('password-changed', 'sent', { userId: user.id, email: user.email, from });
  return Response.json({ success: true, sent: true });
}

type EmailChangedBody = {
  oldEmail?: string;
  newEmail?: string;
};

export async function handleEmailChangedNotificationRequest(
  request: Request
): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    logTransactionalEvent('email-changed', 'skipped', {
      reason: 'supabase_admin_not_configured',
      hint: 'Set SUPABASE_SERVICE_ROLE_KEY on Vercel.',
    });
    return Response.json(
      { error: 'Email notification is not configured on the server.' },
      { status: 503 }
    );
  }

  const user = await getUserFromAuthHeader(request);
  if (!user?.email) {
    return Response.json({ error: 'Sign in required.' }, { status: 401 });
  }

  let body: EmailChangedBody = {};
  try {
    body = (await request.json()) as EmailChangedBody;
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const oldEmail = body.oldEmail?.trim().toLowerCase();
  const newEmail = body.newEmail?.trim().toLowerCase();
  if (!oldEmail || !newEmail) {
    return Response.json({ error: 'oldEmail and newEmail are required.' }, { status: 400 });
  }
  if (oldEmail !== user.email.trim().toLowerCase()) {
    return Response.json({ error: 'oldEmail does not match your account.' }, { status: 400 });
  }
  if (oldEmail === newEmail) {
    return Response.json({ error: 'New email must differ from current email.' }, { status: 400 });
  }

  if (!isResendConfigured()) {
    logTransactionalEvent('email-changed', 'skipped', {
      reason: 'resend_not_configured',
      hint: 'Set RESEND_API_KEY on Vercel.',
      userId: user.id,
      oldEmail,
      newEmail,
    });
    return Response.json({ success: true, skipped: true, reason: 'resend_not_configured' });
  }

  const html = buildEmailChangedAlertHtml(oldEmail, newEmail, getTransactionalAppUrl());
  const from = process.env.WELCOME_FROM_EMAIL?.trim() || 'Penny Pantry <hello@pennypantry.xyz>';

  try {
    await sendViaResend(oldEmail, 'Your Penny Pantry email was changed', html);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logTransactionalEvent('email-changed', 'failed', {
      reason: 'resend_send_error',
      userId: user.id,
      oldEmail,
      newEmail,
      from,
      error: message,
    });
    return Response.json({ error: 'Could not send email change notification.' }, { status: 502 });
  }

  logTransactionalEvent('email-changed', 'sent', { userId: user.id, oldEmail, newEmail, from });
  return Response.json({ success: true, sent: true });
}

/** True when the account email is confirmed (email signup link clicked or OAuth). */
export function isUserEmailConfirmed(user: User): boolean {
  return isEmailConfirmed(user);
}
