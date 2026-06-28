import { Platform } from 'react-native';

import { getSession } from '@/src/services/authService';
import type { FamilyWorkspaceSyncResult } from '@/src/services/stripe/stripeBilling.server';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

function resolveStripeApiUrl(path: string): string | null {
  if (Platform.OS !== 'web') return null;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  const appUrl = process.env.EXPO_PUBLIC_APP_URL?.trim();
  return appUrl ? `${appUrl.replace(/\/$/, '')}${path}` : null;
}

async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('Sign in to sync your household workspace.');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let familyPurchaseSyncInFlight: Promise<boolean> | null = null;
let lastFamilyPurchaseSessionKey: string | null = null;

export async function fetchFamilyWorkspaceSync(
  sessionId?: string
): Promise<FamilyWorkspaceSyncResult | null> {
  const apiUrl = resolveStripeApiUrl('/api/stripe/sync-family-workspace');
  if (!apiUrl) return null;

  try {
    const headers = await authHeaders();
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(sessionId ? { sessionId } : {}),
    });
    if (!response.ok) return null;
    return (await response.json()) as FamilyWorkspaceSyncResult;
  } catch {
    return null;
  }
}

/** Verify Household billing with Stripe, refresh workspace store, and switch to Family scope. */
export async function refreshFamilyWorkspaceAfterPurchase(options?: {
  sessionId?: string;
  maxAttempts?: number;
}): Promise<boolean> {
  const sessionKey = options?.sessionId?.trim() || 'latest';
  if (lastFamilyPurchaseSessionKey === sessionKey) {
    const store = useWorkspaceStore.getState();
    return store.familyWorkspaceReady || store.hasActiveWorkspaceSub;
  }

  if (familyPurchaseSyncInFlight) {
    return familyPurchaseSyncInFlight;
  }

  familyPurchaseSyncInFlight = (async () => {
    const maxAttempts = options?.maxAttempts ?? 5;
    let synced = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await fetchFamilyWorkspaceSync(options?.sessionId);
      if (result?.active) {
        synced = true;
        break;
      }
      if (attempt < maxAttempts - 1) {
        await sleep(800 * (attempt + 1));
      }
    }

    const ready = await useWorkspaceStore.getState().refreshAfterFamilyPurchase();
    lastFamilyPurchaseSessionKey = sessionKey;
    return ready || synced;
  })();

  try {
    return await familyPurchaseSyncInFlight;
  } finally {
    familyPurchaseSyncInFlight = null;
  }
}
