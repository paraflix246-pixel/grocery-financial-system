import type { OAuthIntent } from '@/src/services/onboardingFlowState';

export type PostAuthPlatform = 'web' | 'native';

export type PostOAuthRouteResult = {
  href: string;
  reason: 'join_household' | 'upgrade';
};

/** Where OAuth should land after provider sign-in (before role-specific routing). */
export const OAUTH_CALLBACK_PATH = '/auth/callback';

export const PAYWALL_PATHS = ['/paywall', '/onboarding/upgrade'] as const;

export function isPaywallPath(pathname: string): boolean {
  if (!pathname) return false;
  const normalized = pathname.split('?')[0]?.replace(/\/$/, '') || pathname;
  return PAYWALL_PATHS.some((path) => normalized === path || normalized.endsWith(path));
}

export function resolvePostOAuthRoute(
  _isAdmin: boolean,
  _platform: PostAuthPlatform,
  _oauthIntent: OAuthIntent | null = null
): PostOAuthRouteResult {
  return { href: '/onboarding/upgrade', reason: 'upgrade' };
}

/** Admin users skip paywall but land on the main app — not /admin. */
export function resolveAdminPaywallBypassRoute(_platform: PostAuthPlatform): string {
  return '/(tabs)';
}
