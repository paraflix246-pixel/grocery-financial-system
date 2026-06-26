import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { generateId } from '@/src/utils/id';
import { getAppUrl, getAuthRedirectUrl } from '@/src/utils/appOrigin';
import { syncUserProfile } from '@/src/services/admin/adminApiService';
import { getAppSettings, updateAppSettings } from '@/src/services/storageService';
import { supabase } from '@/src/services/supabaseClient';
import { useSettingsStore } from '@/src/store/useSettingsStore';

export { getAuthRedirectUrl } from '@/src/utils/appOrigin';

WebBrowser.maybeCompleteAuthSession();

const GUEST_USER_ID_KEY = '@smartcart_community_user_id_v1';
const AUTH_USER_KEY = '@smartcart_auth_user_v1';

export type AuthUser = {
  id: string;
  email?: string;
  isGuest: boolean;
};

function mapSupabaseError(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes('email already registered') || msg.includes('user already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (msg.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak_password')) {
    return 'Password must be at least 6 characters.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Please check your email and confirm your account first.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  return 'Something went wrong. Please try again.';
}

export async function continueAsGuest(): Promise<AuthUser> {
  let userId = await AsyncStorage.getItem(GUEST_USER_ID_KEY);
  if (!userId) {
    userId = generateId();
    await AsyncStorage.setItem(GUEST_USER_ID_KEY, userId);
  }
  const user: AuthUser = { id: userId, isGuest: true };
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  return user;
}

function extractAuthDisplayName(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) return '';
  const candidates = [metadata.full_name, metadata.name, metadata.display_name, metadata.given_name];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

async function syncLocalDisplayName(displayName: string): Promise<void> {
  const trimmed = displayName.trim();
  if (!trimmed) return;

  const existing = await getAppSettings();
  if (existing.displayName.trim()) return;

  const updated = await updateAppSettings({ displayName: trimmed });
  useSettingsStore.setState({ settings: updated });
}

export async function syncProfileDisplayNameFromAuth(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const authUser = data.user;
  if (!authUser) return;
  await syncLocalDisplayName(extractAuthDisplayName(authUser.user_metadata));
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> {
  if (!supabase) throw new Error('Auth service not available. Please try again later.');
  const trimmedName = displayName?.trim() ?? '';
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: trimmedName
      ? { data: { display_name: trimmedName, full_name: trimmedName } }
      : undefined,
  });
  if (error) throw new Error(mapSupabaseError(error.message));
  if (!data.user) throw new Error('Something went wrong. Please try again.');
  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email ?? email.trim().toLowerCase(),
    isGuest: false,
  };
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  if (trimmedName) {
    await syncLocalDisplayName(trimmedName);
  }
  return user;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  if (!supabase) throw new Error('Auth service not available. Please try again later.');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new Error(mapSupabaseError(error.message));
  if (!data.user) throw new Error('Could not sign in. Please try again.');
  const user: AuthUser = {
    id: data.user.id,
    email: data.user.email ?? email.trim().toLowerCase(),
    isGuest: false,
  };
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  await syncProfileDisplayNameFromAuth();
  return user;
}

export async function resetPassword(newPassword: string): Promise<void> {
  if (!supabase) throw new Error('Auth service not available. Please try again later.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(mapSupabaseError(error.message));
}

export type ForgotPasswordResult = {
  status: 'sent' | 'oauth_only' | 'generic_success';
  provider?: string;
};

export type SignInHintResult = {
  hint: 'oauth_only' | 'email_password' | 'unknown';
  provider?: string;
};

export async function forgotPassword(email: string): Promise<ForgotPasswordResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const apiUrl = resolveAuthApiUrl('/api/auth/forgot-password');

  if (apiUrl) {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    if (response.ok) {
      return (await response.json()) as ForgotPasswordResult;
    }

    if (response.status !== 503) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? 'Something went wrong. Please try again.');
    }
  }

  if (!supabase) {
    throw new Error('Auth service not available. Please try again later.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: getAuthRedirectUrl('/onboarding/reset-password'),
  });
  if (error) throw new Error(mapSupabaseError(error.message));

  // Client-only fallback cannot distinguish OAuth-only or missing accounts.
  return { status: 'generic_success' };
}

export async function checkSignInHint(email: string): Promise<SignInHintResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const apiUrl = resolveAuthApiUrl('/api/auth/check-signin-hint');

  if (apiUrl) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (response.ok) {
        return (await response.json()) as SignInHintResult;
      }
    } catch (error) {
      console.warn('[auth] check-signin-hint request failed:', error);
    }
  }

  return { hint: 'unknown' };
}

function resolveAuthApiUrl(path: string): string | null {
  if (Platform.OS === 'web') {
    return getAppUrl(path);
  }
  const appUrl = process.env.EXPO_PUBLIC_APP_URL?.trim();
  return appUrl ? `${appUrl.replace(/\/$/, '')}${path}` : null;
}

type WelcomeEmailApiResponse = {
  success?: boolean;
  sent?: boolean;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

let welcomeEmailInFlight = false;

function logWelcomeSkip(reason: string): void {
  if (__DEV__) {
    console.info(`[auth] welcome email skipped: ${reason}`);
  }
}

/** Sends a one-time welcome email via POST /api/auth/welcome (Resend). Non-blocking.
 *  Server env: RESEND_API_KEY, WELCOME_FROM_EMAIL, SUPABASE_SERVICE_ROLE_KEY.
 *  Marks user_metadata.welcome_email_sent via service role after send. */
export async function maybeSendWelcomeEmail(): Promise<void> {
  if (!supabase) {
    logWelcomeSkip('supabase unavailable');
    return;
  }
  if (welcomeEmailInFlight) return;

  welcomeEmailInFlight = true;
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user?.email) {
      logWelcomeSkip('no user email');
      return;
    }
    if (user.user_metadata?.welcome_email_sent === true) {
      logWelcomeSkip('already sent');
      return;
    }

    const apiUrl = resolveAuthApiUrl('/api/auth/welcome');
    if (!apiUrl) {
      logWelcomeSkip('welcome API URL unavailable');
      return;
    }

    const session = await getSession();
    if (!session?.access_token) {
      logWelcomeSkip('no access token');
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const body = (await response.json().catch(() => null)) as WelcomeEmailApiResponse | null;

      if (response.ok && body?.sent) {
        await supabase.auth.refreshSession();
        if (__DEV__) {
          console.info('[auth] welcome email sent');
        }
        return;
      }

      if (response.ok && body?.skipped) {
        logWelcomeSkip(body.reason ?? 'server skipped');
        return;
      }

      console.warn(
        '[auth] welcome email request failed:',
        response.status,
        body?.error ?? body?.reason ?? response.statusText
      );
    } catch (error) {
      console.warn('[auth] welcome email request failed:', error);
    }
  } finally {
    welcomeEmailInFlight = false;
  }
}

export async function syncAuthUserFromSession(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const authUser = data.session?.user;
  if (!authUser) return;
  const user: AuthUser = {
    id: authUser.id,
    email: authUser.email ?? undefined,
    isGuest: false,
  };
  await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  await syncProfileDisplayNameFromAuth();
  void maybeSendWelcomeEmail();
  void syncUserProfile();
}

/** True when the user has an active Supabase account session (not guest-only). */
export async function isSignedInAccount(): Promise<boolean> {
  const session = await getSession();
  return Boolean(session?.user);
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) {
    throw new Error('Auth service not available. Please try again later.');
  }
  const redirectTo = getAuthRedirectUrl('/onboarding/upgrade');
  const oauthOptions = {
    redirectTo,
    scopes: 'openid email profile',
    queryParams: { prompt: 'select_account' },
  };

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: oauthOptions,
    });
    if (error) throw new Error(mapSupabaseError(error.message));
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      ...oauthOptions,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw new Error(mapSupabaseError(error.message));
  if (!data.url) throw new Error('Could not start Google sign-in. Please try again.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    throw new Error('Google sign-in was cancelled.');
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
  if (exchangeError) throw new Error(mapSupabaseError(exchangeError.message));
  await syncAuthUserFromSession();
}

export async function signInWithApple(): Promise<void> {
  if (!supabase) {
    throw new Error('Auth service not available. Please try again later.');
  }
  const redirectTo = getAuthRedirectUrl('/onboarding/upgrade');
  const oauthOptions = {
    redirectTo,
    scopes: 'name email',
  };

  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: oauthOptions,
    });
    if (error) throw new Error(mapSupabaseError(error.message));
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      ...oauthOptions,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw new Error(mapSupabaseError(error.message));
  if (!data.url) throw new Error('Could not start Apple sign-in. Please try again.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') {
    throw new Error('Apple sign-in was cancelled.');
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
  if (exchangeError) throw new Error(mapSupabaseError(exchangeError.message));
  await syncAuthUserFromSession();
}

export async function signOut(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
  await AsyncStorage.removeItem(AUTH_USER_KEY);
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

/** Supabase auth user id, or guest/local id — used for workspace membership. */
export async function resolveAppUserId(): Promise<string | null> {
  const session = await getSession();
  if (session?.user?.id) return session.user.id;
  const stored = await getStoredUser();
  return stored?.id ?? null;
}
