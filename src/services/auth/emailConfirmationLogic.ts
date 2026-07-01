export type EmailConfirmableUser = {
  email_confirmed_at?: string | null;
  identities?: { provider?: string }[];
};

/** True when the account email is confirmed (verification link clicked or OAuth). */
export function isEmailConfirmed(user: EmailConfirmableUser): boolean {
  if (user.email_confirmed_at) return true;
  const providers = (user.identities ?? []).map((identity) => identity.provider);
  return providers.some((provider) => provider && provider !== 'email');
}

/** True when sign-up succeeded but the user must verify email before signing in. */
export function needsEmailVerificationAfterSignUp(
  session: unknown | null,
  user: EmailConfirmableUser
): boolean {
  if (session) return false;
  return !isEmailConfirmed(user);
}

export function buildSignupVerificationRedirectUrl(
  getRedirectUrl: (path: string) => string,
  callbackPath: string
): string {
  return getRedirectUrl(`${callbackPath}?intent=signup`);
}
