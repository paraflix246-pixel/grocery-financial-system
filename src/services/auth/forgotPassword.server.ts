import type { User } from '@supabase/supabase-js';

import { getAppUrl } from '@/src/utils/appOrigin';
import {
  getSupabaseAdmin,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';
const OAUTH_PROVIDERS = new Set([
  'google',
  'apple',
  'facebook',
  'github',
  'azure',
  'twitter',
  'discord',
]);

export type ForgotPasswordStatus = 'sent' | 'oauth_only' | 'generic_success';

export type ForgotPasswordResponse = {
  status: ForgotPasswordStatus;
  provider?: string;
};

export type SignInHintStatus = 'oauth_only' | 'email_password' | 'unknown';

export type SignInHintResponse = {
  hint: SignInHintStatus;
  provider?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getPasswordResetRedirectUrl(): string {
  return getAppUrl('/onboarding/reset-password');
}

/** Providers linked to the Supabase auth user (identities + app_metadata). */
export function extractAuthProviders(user: User): string[] {
  const fromIdentities = (user.identities ?? [])
    .map((identity) => identity.provider)
    .filter((provider): provider is string => Boolean(provider));
  const fromMeta = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers.map(String)
    : typeof user.app_metadata?.provider === 'string' && user.app_metadata.provider.trim()
      ? [user.app_metadata.provider.trim()]
      : [];
  return [...new Set([...fromIdentities, ...fromMeta])];
}

/** True when the account can only sign in via OAuth (no email/password identity). */
export function isOAuthOnlyAccount(providers: string[]): boolean {
  if (providers.length === 0) return false;
  const hasEmailPassword = providers.includes('email');
  const hasOAuth = providers.some((provider) => OAUTH_PROVIDERS.has(provider));
  return hasOAuth && !hasEmailPassword;
}

export function primaryOAuthProvider(providers: string[]): string | null {
  for (const candidate of ['google', 'apple']) {
    if (providers.includes(candidate)) return candidate;
  }
  return providers.find((provider) => OAUTH_PROVIDERS.has(provider)) ?? null;
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = getSupabaseAdmin();

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (profileError) {
    console.warn('[auth/forgot-password] profile lookup failed:', profileError.message);
  }

  if (profile?.id) {
    const { data, error } = await admin.auth.admin.getUserById(profile.id);
    if (error) {
      console.warn('[auth/forgot-password] getUserById failed:', error.message);
    }
    if (data.user) return data.user;
  }

  // Fallback for accounts without a synced profile row (small projects only).
  let page = 1;
  const perPage = 200;
  while (page <= 5) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn('[auth/forgot-password] listUsers failed:', error.message);
      break;
    }
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (match) return match;
    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

export async function handleForgotPasswordRequest(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return Response.json({ error: 'Password reset is not configured on the server.' }, { status: 503 });
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  if (!isValidEmail(email)) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const user = await findAuthUserByEmail(email);

  // Do not reveal whether the email exists — same as Supabase client behavior.
  if (!user) {
    return Response.json({ status: 'generic_success' } satisfies ForgotPasswordResponse);
  }

  const providers = extractAuthProviders(user);
  if (isOAuthOnlyAccount(providers)) {
    const provider = primaryOAuthProvider(providers) ?? 'google';
    return Response.json({ status: 'oauth_only', provider } satisfies ForgotPasswordResponse);
  }

  const admin = getSupabaseAdmin();
  const redirectTo = getPasswordResetRedirectUrl();
  const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    console.warn('[auth/forgot-password] resetPasswordForEmail failed:', error.message);
    return Response.json({ error: 'Could not send reset email. Please try again.' }, { status: 502 });
  }

  const { logEmailEvent } = await import('@/src/services/admin/emailLog.server');
  await logEmailEvent({
    userId: user.id,
    email,
    emailType: 'password_reset',
    status: 'sent',
  });

  return Response.json({ status: 'sent' } satisfies ForgotPasswordResponse);
}

function parseEmailFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('email');
  if (fromQuery && isValidEmail(fromQuery)) {
    return normalizeEmail(fromQuery);
  }
  return null;
}

async function parseEmailFromBody(request: Request): Promise<string | null> {
  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return null;
  }
  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  return isValidEmail(email) ? email : null;
}

/** Hints for email/password sign-in failures without revealing whether the email exists. */
export async function resolveSignInHint(email: string): Promise<SignInHintResponse> {
  const user = await findAuthUserByEmail(email);
  if (!user) {
    return { hint: 'unknown' };
  }

  const providers = extractAuthProviders(user);
  if (isOAuthOnlyAccount(providers)) {
    const provider = primaryOAuthProvider(providers) ?? 'google';
    return { hint: 'oauth_only', provider };
  }

  return { hint: 'email_password' };
}

export async function handleCheckSignInHintRequest(request: Request): Promise<Response> {
  if (!isSupabaseAdminConfigured()) {
    return Response.json({ hint: 'unknown' } satisfies SignInHintResponse);
  }

  let email = parseEmailFromRequest(request);
  if (!email && request.method === 'POST') {
    email = await parseEmailFromBody(request);
  }

  if (!email) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const result = await resolveSignInHint(email);
  return Response.json(result satisfies SignInHintResponse);
}
