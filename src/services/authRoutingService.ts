import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { isAdminUser, syncUserProfile } from '@/src/services/admin/adminApiService';
import { getSession, getStoredUser } from '@/src/services/authService';

export {
  ONBOARDING_STORAGE_KEY,
  REMEMBER_ME_KEY,
  LAST_ACTIVITY_KEY,
  WEB_IDLE_TIMEOUT_MS,
  isIdleTimedOut,
  needsReauthentication,
  resolveInitialRoute,
  shouldPromptLogin,
  isProtectedAppRoute,
  type AuthRoutingContext,
  type InitialRouteResult,
  type LoginPromptReason,
} from '@/src/services/authRoutingLogic';

import type { AuthRoutingContext } from '@/src/services/authRoutingLogic';

export async function getRememberMePreference(): Promise<boolean> {
  const raw = await AsyncStorage.getItem('@smartcart_remember_me');
  if (raw === null) return true;
  return raw === 'true';
}

export async function setRememberMePreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem('@smartcart_remember_me', enabled ? 'true' : 'false');
}

export async function getLastActivityTimestamp(): Promise<number | null> {
  const raw = await AsyncStorage.getItem('@smartcart_last_activity_at');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function recordActivityTimestamp(at: number = Date.now()): Promise<void> {
  await AsyncStorage.setItem('@smartcart_last_activity_at', String(at));
}

export async function loadAuthRoutingContext(
  onboardingComplete: boolean,
  now: number = Date.now()
): Promise<AuthRoutingContext> {
  const [session, storedUser, rememberMe, lastActivityAt] = await Promise.all([
    getSession(),
    getStoredUser(),
    getRememberMePreference(),
    getLastActivityTimestamp(),
  ]);

  let isAdmin = false;
  if (session) {
    await syncUserProfile();
    isAdmin = isAdminUser();
  }

  return {
    onboardingComplete,
    hasSupabaseSession: Boolean(session),
    storedUser,
    rememberMe,
    lastActivityAt,
    now,
    platform: Platform.OS === 'web' ? 'web' : 'native',
    isAdmin,
  };
}
