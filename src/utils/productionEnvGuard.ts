const LOCALHOST_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

export function isLocalhostServiceUrl(url: string): boolean {
  return LOCALHOST_URL_PATTERN.test(url);
}

/** Ignore localhost service URLs when running in production (e.g. Vercel). */
export function resolveProductionSafeUrl(
  envUrl: string | undefined,
  label: string
): string | null {
  const url = envUrl?.trim();
  if (!url) return null;

  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (isProduction && isLocalhostServiceUrl(url)) {
    console.warn(`[${label}] Ignoring localhost URL in production: ${url}`);
    return null;
  }

  return url;
}

/**
 * Resolve a client-side API base URL from an EXPO_PUBLIC_* env var.
 * Ignores localhost values baked in at build time when running in production,
 * then falls back to same-origin `/api/...` on web.
 */
export function resolvePublicServiceUrl(
  envUrl: string | undefined,
  label: string,
  sameOriginApiPath: string
): string | null {
  const configured = resolveProductionSafeUrl(envUrl, label);
  if (configured) return configured.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    return `${origin}${sameOriginApiPath.startsWith('/') ? sameOriginApiPath : `/${sameOriginApiPath}`}`;
  }

  return null;
}
