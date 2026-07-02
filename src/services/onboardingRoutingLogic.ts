/** Routes allowed while onboarding product try is in progress (step 3). */
export const ONBOARDING_TRY_ROUTE_PREFIXES = [
  '/(tabs)/scan',
  '/receipt/',
  '/pantry',
  '/list/',
] as const;

export function isOnboardingTryRoute(pathname: string): boolean {
  if (!pathname) return false;
  const normalized = pathname.split('?')[0]?.replace(/\/$/, '') || pathname;
  if (normalized === '/(tabs)/scan' || normalized.endsWith('/scan')) return true;
  if (normalized.startsWith('/receipt')) return true;
  if (normalized === '/pantry' || normalized.startsWith('/pantry/')) return true;
  if (normalized.startsWith('/list')) return true;
  return ONBOARDING_TRY_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix)
  );
}

export function shouldBlockOnboardingRedirect(
  onboardingComplete: boolean,
  tryInProgress: boolean,
  pathname: string,
  isPublicRoute: boolean,
  isOnboardingRoute: boolean
): boolean {
  if (onboardingComplete || isPublicRoute || isOnboardingRoute) return true;
  if (tryInProgress && isOnboardingTryRoute(pathname)) return true;
  return false;
}
