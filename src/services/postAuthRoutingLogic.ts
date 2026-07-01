import type { OAuthIntent } from '@/src/services/onboardingFlowState';

export type PostAuthPlatform = 'web' | 'native';

export type PostOAuthRouteResult = {
  href: string;
  reason: 'admin' | 'join_household' | 'upgrade';
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
  isAdmin: boolean,
  platform: PostAuthPlatform,
  oauthIntent: OAuthIntent | null = null
): PostOAuthRouteResult {
  if (isAdmin) {
    return {
      href: platform === 'web' ? '/admin' : '/(tabs)',
      reason: 'admin',
    };
  }
  if (oauthIntent === 'signup') {
    return { href: '/onboarding/join-household', reason: 'join_household' };
  }
  return { href: '/onboarding/upgrade', reason: 'upgrade' };
}

export function resolveAdminPaywallBypassRoute(platform: PostAuthPlatform): string {
  return platform === 'web' ? '/admin' : '/(tabs)';
}
