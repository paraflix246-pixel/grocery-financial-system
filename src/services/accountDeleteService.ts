import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  LOCAL_PREF_KEYS,
  filterDynamicLocalKeys,
  resolveAccountApiUrl as resolveAccountApiUrlCore,
} from '@/src/services/accountDeleteLogic';
import { getSession, getStoredUser, signOut } from '@/src/services/authService';
import { wipeAllLocalData } from '@/src/services/storageService';
import { clearTrial } from '@/src/services/trialService';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';

export {
  DELETE_CONFIRMATION_TOKEN,
  LOCAL_PREF_KEYS,
  isDeleteConfirmationValid,
} from '@/src/services/accountDeleteLogic';

export function resolveAccountApiUrl(path: string): string | null {
  const webOrigin =
    Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : null;

  return resolveAccountApiUrlCore(path, {
    webOrigin,
    appUrl: process.env.EXPO_PUBLIC_APP_URL ?? null,
  });
}

async function removeDynamicLocalKeys(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = filterDynamicLocalKeys(keys);
  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
}

export async function clearAllLocalData(): Promise<void> {
  await wipeAllLocalData();
  await AsyncStorage.multiRemove([...LOCAL_PREF_KEYS]);
  await removeDynamicLocalKeys();
  await clearTrial();
  await useSubscriptionStore.getState().downgradeToFree();
  useSettingsStore.setState({ settings: null, loading: false });
}

async function deleteRemoteAccount(): Promise<void> {
  const apiUrl = resolveAccountApiUrl('/api/account/delete');
  if (!apiUrl) {
    throw new Error('Account deletion is only available when the app API is configured.');
  }

  const session = await getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('Sign in to delete your account.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? 'Could not delete your account. Please try again.');
  }
}

/** Permanently deletes a signed-in cloud account and clears local app data. */
export async function deleteAccount(): Promise<void> {
  const stored = await getStoredUser();
  if (stored?.isGuest) {
    await clearAllLocalData();
    return;
  }

  await deleteRemoteAccount();
  await clearAllLocalData();
  await signOut();
}

/** Guest-only: wipe local receipts, lists, and preferences without a server call. */
export async function clearGuestLocalData(): Promise<void> {
  await clearAllLocalData();
  await signOut();
}

export async function isSignedInAccount(): Promise<boolean> {
  const stored = await getStoredUser();
  if (stored?.isGuest) return false;
  const session = await getSession();
  return Boolean(session?.user);
}

export async function isGuestOrUnsigned(): Promise<boolean> {
  const stored = await getStoredUser();
  if (stored?.isGuest) return true;
  const session = await getSession();
  return !session?.user;
}
