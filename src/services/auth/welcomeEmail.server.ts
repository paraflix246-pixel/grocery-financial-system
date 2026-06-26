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
  getSupabaseAdmin,
  getUserFromAuthHeader,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';

const DEFAULT_FROM = 'Penny Pantry <hello@pennypantry.xyz>';
const DEFAULT_APP_URL = 'https://pennypantry.xyz';

export function isWelcomeEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getWelcomeFromEmail(): string {
  return process.env.WELCOME_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

function getAppUrl(): string {
  return process.env.EXPO_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') || DEFAULT_APP_URL;
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

async function sendViaResend(to: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getWelcomeFromEmail(),
      to: [to],
      subject: 'Welcome to Penny Pantry',
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error (${response.status}): ${body || response.statusText}`);
  }
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

  const from = getWelcomeFromEmail();
  try {
    await sendViaResend(user.email, html);
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
  return Response.json({ success: true, sent: true });
}
