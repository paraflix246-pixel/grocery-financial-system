import {
  buildEmailCard,
  buildEmailCta,
  buildEmailDocument,
  buildEmailHeader,
  buildEmailInnerFooter,
  buildEmailSupportFooter,
  EMAIL_BRAND,
  getEmailLogoUrl,
} from '@/src/services/auth/emailBranding';
import {
  getTransactionalAppUrl,
  getTransactionalFromEmail,
  isResendConfigured,
  sendViaResend,
} from '@/src/services/auth/resendEmail.server';
import { isUserEmailConfirmed } from '@/src/services/auth/transactionalEmail.server';
import {
  getSupabaseAdmin,
  getUserFromAuthHeader,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';

export function isWelcomeEmailConfigured(): boolean {
  return isResendConfigured();
}

function getAppUrl(): string {
  return getTransactionalAppUrl();
}

function extractDisplayName(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return '';
  const candidates = [metadata.display_name, metadata.full_name, metadata.name, metadata.given_name];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function buildWelcomeEmailHtml(displayName: string, appUrl: string): string {
  const greeting = displayName ? `Hi ${displayName},` : 'Hi there,';
  const logoUrl = getEmailLogoUrl(appUrl);
  const { text, textSecondary, fontFamily } = EMAIL_BRAND;

  const cardBody = `<tr>
            <td class="email-body" style="padding:32px;">
              <p class="email-title" style="margin:0 0 16px;color:${text};font-family:${fontFamily};font-size:20px;font-weight:700;line-height:1.3;">${greeting}</p>
              <p style="margin:0 0 20px;color:${textSecondary};font-family:${fontFamily};font-size:16px;line-height:1.6;">
                Thanks for joining Penny Pantry. We're glad you're here — let's start saving on groceries.
              </p>
              <p style="margin:0 0 12px;color:${text};font-family:${fontFamily};font-size:15px;font-weight:600;">Here's how to get started:</p>
              <ul style="margin:0 0 24px;padding-left:20px;color:${textSecondary};font-family:${fontFamily};font-size:15px;line-height:1.7;">
                <li>Scan receipts to track spending automatically</li>
                <li>Compare prices across stores</li>
                <li>Build smart grocery lists</li>
              </ul>
              ${buildEmailCta(appUrl, 'Open Penny Pantry')}
              ${buildEmailInnerFooter(appUrl)}
            </td>
          </tr>`;

  return buildEmailDocument(
    'Welcome to Penny Pantry',
    `${buildEmailCard(`${buildEmailHeader(logoUrl)}${cardBody}`)}${buildEmailSupportFooter()}`,
  );
}

export function buildTestEmailHtml(appUrl: string): string {
  const logoUrl = getEmailLogoUrl(appUrl);
  const { text, textSecondary, fontFamily } = EMAIL_BRAND;

  const cardBody = `<tr>
            <td class="email-body" style="padding:32px;">
              <h1 class="email-title" style="margin:0 0 16px;color:${text};font-family:${fontFamily};font-size:20px;font-weight:700;line-height:1.3;">Email test</h1>
              <p style="margin:0 0 20px;color:${textSecondary};font-family:${fontFamily};font-size:16px;line-height:1.6;">
                If you received this, Resend is configured correctly and Penny Pantry email branding is working.
              </p>
              ${buildEmailCta(appUrl, 'Open Penny Pantry')}
              ${buildEmailInnerFooter(appUrl)}
            </td>
          </tr>`;

  return buildEmailDocument(
    'Penny Pantry — email test',
    `${buildEmailCard(`${buildEmailHeader(logoUrl)}${cardBody}`)}${buildEmailSupportFooter()}`,
  );
}

async function sendWelcomeViaResend(to: string, html: string): Promise<void> {
  await sendViaResend(to, 'Welcome to Penny Pantry', html);
}

function logWelcomeEvent(
  outcome: 'skipped' | 'sent' | 'failed',
  detail: Record<string, unknown>
): void {
  const line = `[auth/welcome] ${outcome}: ${JSON.stringify(detail)}`;
  if (outcome === 'sent') {
    console.info(line);
  } else {
    console.warn(line);
  }
}

export async function handleWelcomeEmailRequest(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    logWelcomeEvent('skipped', {
      reason: 'supabase_admin_not_configured',
      hint: 'Set SUPABASE_SERVICE_ROLE_KEY on Vercel (Supabase Dashboard → Project Settings → API → service_role).',
    });
    return Response.json({ error: 'Welcome email is not configured on the server.' }, { status: 503 });
  }

  const user = await getUserFromAuthHeader(request);
  if (!user?.email) {
    return Response.json({ error: 'Sign in required to send welcome email.' }, { status: 401 });
  }

  if (user.user_metadata?.welcome_email_sent === true) {
    logWelcomeEvent('skipped', { reason: 'already_sent', userId: user.id, email: user.email });
    return Response.json({ success: true, skipped: true, reason: 'already_sent' });
  }

  if (!isUserEmailConfirmed(user)) {
    logWelcomeEvent('skipped', {
      reason: 'email_not_confirmed',
      userId: user.id,
      email: user.email,
    });
    return Response.json({ success: true, skipped: true, reason: 'email_not_confirmed' });
  }

  if (!isWelcomeEmailConfigured()) {
    logWelcomeEvent('skipped', {
      reason: 'resend_not_configured',
      hint: 'Set RESEND_API_KEY on Vercel.',
      userId: user.id,
      email: user.email,
    });
    return Response.json({ success: true, skipped: true, reason: 'resend_not_configured' });
  }

  const displayName = extractDisplayName(user.user_metadata);
  const html = buildWelcomeEmailHtml(displayName, getAppUrl());

  const from = getTransactionalFromEmail();
  try {
    await sendWelcomeViaResend(user.email, html);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logWelcomeEvent('failed', {
      reason: 'resend_send_error',
      userId: user.id,
      email: user.email,
      from,
      error: message,
    });
    return Response.json({ error: 'Could not send welcome email.' }, { status: 502 });
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        welcome_email_sent: true,
        welcome_email_sent_at: new Date().toISOString(),
      },
    });
    if (error) {
      console.warn('[auth/welcome] metadata update failed:', error.message);
    }
  } catch (error) {
    console.warn('[auth/welcome] metadata update error:', error);
  }

  logWelcomeEvent('sent', { userId: user.id, email: user.email, from });

  const { logEmailEvent } = await import('@/src/services/admin/emailLog.server');
  await logEmailEvent({
    userId: user.id,
    email: user.email,
    emailType: 'welcome',
    status: 'sent',
  });

  return Response.json({ success: true, sent: true });
}
