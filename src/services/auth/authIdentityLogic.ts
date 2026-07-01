/** OAuth providers supported by Penny Pantry sign-in. */
const OAUTH_PROVIDERS = new Set([
  'google',
  'apple',
  'facebook',
  'github',
  'azure',
  'twitter',
  'discord',
]);

export type AuthProviderUser = {
  identities?: { provider?: string }[];
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
};

/** Providers linked to the Supabase auth user (identities + app_metadata). */
export function extractAuthProviders(user: AuthProviderUser): string[] {
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
