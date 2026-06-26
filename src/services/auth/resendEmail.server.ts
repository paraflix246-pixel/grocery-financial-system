const DEFAULT_FROM = 'Penny Pantry <hello@pennypantry.xyz>';
const DEFAULT_APP_URL = 'https://pennypantry.xyz';

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getTransactionalFromEmail(): string {
  return process.env.WELCOME_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

export function getTransactionalAppUrl(): string {
  return process.env.EXPO_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') || DEFAULT_APP_URL;
}

export async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
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
      from: getTransactionalFromEmail(),
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Resend API error (${response.status}): ${body || response.statusText}`);
  }
}
