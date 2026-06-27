import type { AuthUser } from '@/src/services/authService';

export const ONBOARDING_STORAGE_KEY = 'grocery_onboarding_complete';
export const REMEMBER_ME_KEY = '@smartcart_remember_me';
export const LAST_ACTIVITY_KEY = '@smartcart_last_activity_at';

/** Web idle timeout before prompting re-login when remember-me is off. */
export const WEB_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export type AuthRoutingContext = {
  onboardingComplete: boolean;
  hasSupabaseSession: boolean;
  storedUser: AuthUser | null;
  rememberMe: boolean;
  lastActivityAt: number | null;
  now: number;
  platform: 'web' | 'native';
  isAdmin: boolean;
};

export type InitialRouteResult = {
  href: string;
  reason:
    | 'onboarding_incomplete'
    | 'session_expired'
    | 'idle_timeout'
    | 'dashboard';
  requiresSignOut?: boolean;
};

export type LoginPromptReason = 'session_expired' | 'idle_timeout';

export function isIdleTimedOut(ctx: AuthRoutingContext): boolean {
  if (ctx.platform !== 'web') return false;
  if (ctx.rememberMe) return false;
  if (!ctx.hasSupabaseSession) return false;
  if (ctx.lastActivityAt === null) return false;
  return ctx.now - ctx.lastActivityAt >= WEB_IDLE_TIMEOUT_MS;
}

export function needsReauthentication(ctx: AuthRoutingContext): boolean {
  if (!ctx.onboardingComplete) return false;
  if (ctx.storedUser?.isGuest) return false;

  if (ctx.hasSupabaseSession && isIdleTimedOut(ctx)) {
    return true;
  }

  if (!ctx.hasSupabaseSession && ctx.storedUser && !ctx.storedUser.isGuest) {
    return true;
  }

  return false;
}

export function resolveInitialRoute(ctx: AuthRoutingContext): InitialRouteResult {
  if (!ctx.onboardingComplete && !ctx.hasSupabaseSession) {
    return { href: '/onboarding', reason: 'onboarding_incomplete' };
  }

  if (needsReauthentication(ctx)) {
    const reason: InitialRouteResult['reason'] = isIdleTimedOut(ctx)
      ? 'idle_timeout'
      : 'session_expired';
    return {
      href: '/onboarding/signin?returnTo=%2F(tabs)',
      reason,
      requiresSignOut: ctx.hasSupabaseSession,
    };
  }

  if (ctx.isAdmin && ctx.platform === 'web') {
    return { href: '/admin', reason: 'dashboard' };
  }

  return { href: '/(tabs)', reason: 'dashboard' };
}

export function shouldPromptLogin(ctx: AuthRoutingContext): LoginPromptReason | null {
  if (!needsReauthentication(ctx)) return null;
  return isIdleTimedOut(ctx) ? 'idle_timeout' : 'session_expired';
}

export function isProtectedAppRoute(pathname: string): boolean {
  if (!pathname || pathname === '/') return false;
  if (pathname.startsWith('/onboarding')) return false;
  if (pathname.startsWith('/auth/')) return false;
  if (pathname === '/privacy' || pathname === '/terms' || pathname === '/reset-password') {
    return false;
  }
  return true;
}
