import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import {
  isLocalhostServiceUrl,
  resolveProductionSafeUrl,
} from '@/src/utils/productionEnvGuard';

/** Production web origin — apex domain; www.pennypantry.xyz should redirect here. */
export const DEFAULT_APP_URL = 'https://pennypantry.xyz';

const LOCALHOST_HOST_PATTERN = /^(localhost|127\.0\.0\.1)$/i;
const LOCALHOST_URL_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, '');
}

function isBrowserLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  return LOCALHOST_HOST_PATTERN.test(window.location.hostname);
}

/** True when a URL points at localhost (or 127.0.0.1). */
export function isLocalhostUrl(url: string): boolean {
  return isLocalhostServiceUrl(url) || LOCALHOST_URL_PATTERN.test(url);
}

/**
 * Resolve the app origin for OAuth redirects, invite links, and API calls.
 * Web prefers `window.location.origin`; native prefers EXPO_PUBLIC_APP_URL.
 */
export function getAppOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return normalizeOrigin(window.location.origin);
  }

  const appUrl = resolveProductionSafeUrl(process.env.EXPO_PUBLIC_APP_URL, 'EXPO_PUBLIC_APP_URL');
  if (appUrl) {
    return normalizeOrigin(appUrl);
  }

  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProduction || typeof window === 'undefined') {
    return normalizeOrigin(DEFAULT_APP_URL);
  }

  if (Platform.OS !== 'web') {
    return normalizeOrigin(Linking.createURL('/'));
  }

  return normalizeOrigin(DEFAULT_APP_URL);
}

/** Same-origin API path on web; absolute app URL on native. */
export function resolveAppApiUrl(path: string): string | null {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (Platform.OS === 'web') {
    return getAppUrl(normalizedPath);
  }

  const appUrl = resolveProductionSafeUrl(process.env.EXPO_PUBLIC_APP_URL, 'EXPO_PUBLIC_APP_URL');
  if (appUrl) {
    return `${normalizeOrigin(appUrl)}${normalizedPath}`;
  }

  const isProduction =
    process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  if (isProduction) {
    return `${normalizeOrigin(DEFAULT_APP_URL)}${normalizedPath}`;
  }

  return null;
}

/** Build an absolute app URL for a path (path must start with `/`). */
export function getAppUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getAppOrigin()}${normalizedPath}`;
}

/**
 * OAuth/password-reset redirect target.
 * Never sends production users to localhost when env was misconfigured at build time.
 */
export function getAuthRedirectUrl(path: string): string {
  if (Platform.OS !== 'web') {
    const appUrl = resolveProductionSafeUrl(process.env.EXPO_PUBLIC_APP_URL, 'EXPO_PUBLIC_APP_URL');
    if (appUrl) {
      return `${normalizeOrigin(appUrl)}${path}`;
    }
    const isProduction =
      process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (isProduction) {
      return `${normalizeOrigin(DEFAULT_APP_URL)}${path}`;
    }
    return Linking.createURL(path);
  }

  let redirectUrl = getAppUrl(path);

  if (isLocalhostUrl(redirectUrl)) {
    if (typeof window !== 'undefined' && !isBrowserLocalhost()) {
      redirectUrl = `${normalizeOrigin(DEFAULT_APP_URL)}${path}`;
    } else if (
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL_ENV === 'production'
    ) {
      redirectUrl = `${normalizeOrigin(DEFAULT_APP_URL)}${path}`;
    }
  }

  return redirectUrl;
}
