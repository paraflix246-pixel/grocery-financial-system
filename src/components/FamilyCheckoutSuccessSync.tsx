import { Platform } from 'react-native';
import { useEffect } from 'react';

import { refreshFamilyWorkspaceAfterPurchase } from '@/src/services/familyWorkspacePurchaseService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';

function stripStripeSuccessParams(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (url.searchParams.get('stripe') !== 'success') return;
  url.searchParams.delete('stripe');
  url.searchParams.delete('type');
  url.searchParams.delete('session_id');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

/** Runs Household billing sync as soon as Stripe redirects back (before route-specific screens mount). */
export function FamilyCheckoutSuccessSync() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') !== 'success') return;

    const checkoutType = params.get('type');
    if (checkoutType !== 'family' && checkoutType !== 'workspace') return;

    const sessionId = params.get('session_id') ?? undefined;
    void (async () => {
      await useSubscriptionStore.getState().loadSubscription();
      const ready = await refreshFamilyWorkspaceAfterPurchase({ sessionId, maxAttempts: 8 });
      if (ready) {
        stripStripeSuccessParams();
      }
    })();
  }, []);

  return null;
}
