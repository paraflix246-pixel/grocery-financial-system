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
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;border:1px solid #E5E7EB;overflow:hidden;">
        <tr><td style="background:#22C55E;padding:28px 32px;text-align:center;">
          <p style="margin:0;color:#FFFFFF;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Penny Pantry</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:700;">${greeting}</p>
          <p style="margin:0 0 20px;color:#4B5563;font-size:16px;line-height:1.6;">
            Thanks for joining Penny Pantry. We're glad you're here.
          </p>
          <p style="margin:0 0 12px;color:#111827;font-size:15px;font-weight:600;">Here's what you can do:</p>
          <ul style="margin:0 0 24px;padding-left:20px;color:#4B5563;font-size:15px;line-height:1.7;">
            <li>Scan receipts to track spending automatically</li>
            <li>Compare prices across stores</li>
            <li>Build smart grocery lists</li>
          </ul>
          <p style="margin:0 0 28px;text-align:center;">
            <a href="${appUrl}" style="display:inline-block;background:#22C55E;color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:700;padding:14px 28px;border-radius:999px;">Open Penny Pantry</a>
          </p>
          <p style="margin:0;color:#9CA3AF;font-size:13px;line-height:1.5;text-align:center;">
            Happy saving,<br>The Penny Pantry team
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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

export async function handleWelcomeEmailRequest(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return Response.json({ error: 'Welcome email is not configured on the server.' }, { status: 503 });
  }

  const user = await getUserFromAuthHeader(request);
  if (!user?.email) {
    return Response.json({ error: 'Sign in required to send welcome email.' }, { status: 401 });
  }

  if (user.user_metadata?.welcome_email_sent === true) {
    return Response.json({ success: true, skipped: true, reason: 'already_sent' });
  }

  if (!isWelcomeEmailConfigured()) {
    return Response.json({ success: true, skipped: true, reason: 'resend_not_configured' });
  }

  const displayName = extractDisplayName(user.user_metadata);
  const html = buildWelcomeEmailHtml(displayName, getAppUrl());

  try {
    await sendViaResend(user.email, html);
  } catch (error) {
    console.warn('[auth/welcome] send failed:', error);
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

  return Response.json({ success: true, sent: true });
}
