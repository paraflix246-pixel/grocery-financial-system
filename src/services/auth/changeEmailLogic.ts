import {
  extractAuthProviders,
  isOAuthOnlyAccount,
  primaryOAuthProvider,
  type AuthProviderUser,
} from '@/src/services/auth/authIdentityLogic';

export type ChangeEmailErrorCode =
  | 'auth_unavailable'
  | 'sign_in_required'
  | 'same_email'
  | 'invalid_email'
  | 'email_in_use'
  | 'rate_limited'
  | 'reauthentication_required'
  | 'oauth_only'
  | 'redirect_not_allowed'
  | 'generic';

export class ChangeEmailError extends Error {
  readonly code: ChangeEmailErrorCode;

  constructor(code: ChangeEmailErrorCode, devMessage?: string) {
    super(devMessage ?? code);
    this.code = code;
    this.name = 'ChangeEmailError';
  }
}

export type SupabaseAuthErrorLike = {
  message?: string;
  code?: string;
};

export function buildEmailChangeRedirectUrl(
  getRedirectUrl: (path: string) => string,
  callbackPath: string
): string {
  return getRedirectUrl(`${callbackPath}?intent=email-change`);
}

export function getOAuthOnlyChangeEmailBlock(
  user: AuthProviderUser
): { blocked: true; provider: string } | { blocked: false } {
  const providers = extractAuthProviders(user);
  if (!isOAuthOnlyAccount(providers)) {
    return { blocked: false };
  }
  return {
    blocked: true,
    provider: primaryOAuthProvider(providers) ?? 'google',
  };
}

/** Maps Supabase updateUser email errors to stable app error codes. */
export function mapChangeEmailSupabaseError(error: SupabaseAuthErrorLike): ChangeEmailErrorCode {
  const code = (error.code ?? '').toLowerCase();
  const msg = (error.message ?? '').toLowerCase();

  if (
    code === 'email_exists' ||
    code === 'user_already_exists' ||
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('user already registered') ||
    msg.includes('email address is already')
  ) {
    return 'email_in_use';
  }

  if (
    code === 'over_email_send_rate_limit' ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('once every')
  ) {
    return 'rate_limited';
  }

  if (
    code === 'validation_failed' ||
    msg.includes('invalid email') ||
    msg.includes('invalid format') ||
    msg.includes('unable to validate email')
  ) {
    return 'invalid_email';
  }

  if (msg.includes('reauthenticat')) {
    return 'reauthentication_required';
  }

  if (
    msg.includes('redirect') &&
    (msg.includes('not allowed') || msg.includes('invalid') || msg.includes('mismatch'))
  ) {
    return 'redirect_not_allowed';
  }

  return 'generic';
}
