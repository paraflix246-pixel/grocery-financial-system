const LOCALHOST_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

/** Ignore localhost service URLs when running in production (e.g. Vercel). */
export function resolveProductionSafeUrl(
  envUrl: string | undefined,
  label: string
): string | null {
  const url = envUrl?.trim();
  if (!url) return null;

  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (isProduction && LOCALHOST_URL_PATTERN.test(url)) {
    console.warn(`[${label}] Ignoring localhost URL in production: ${url}`);
    return null;
  }

  return url;
}
