import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { generateId } from '@/src/utils/id';
import { getAppSettings, updateAppSettings } from '@/src/services/storageService';
import { supabase } from '@/src/services/supabaseClient';
import { useSettingsStore } from '@/src/store/useSettingsStore';

/** Production web origin — apex domain; www.pennypantry.xyz should redirect here. */
const DEFAULT_APP_URL = 'https://pennypantry.xyz';

WebBrowser.maybeCompleteAuthSession();

/** OAuth / password-reset redirect target — never use localhost on native. */
export function getAuthRedirectUrl(path: string): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}${path}`;
    }
    const appUrl = process.env.EXPO_PUBLIC_APP_URL?.trim();
    return appUrl ? `${appUrl.replace(/\/$/, '')}${path}` : `${DEFAULT_APP_URL}${path}`;
  }

  const appUrl = process.env.EXPO_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return `${appUrl.replace(/\/$/, '')}${path}`;
  }
  return Linking.createURL(path);
}

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

export async function forgotPassword(email: string): Promise<void> {
  if (!supabase) {
    // Supabase not available (e.g. web without env vars) — fail gracefully
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: getAuthRedirectUrl('/reset-password'),
  });
  if (error) throw new Error(mapSupabaseError(error.message));
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
