import { Platform } from 'react-native';
import { useEffect } from 'react';

import { refreshFamilyWorkspaceAfterPurchase } from '@/src/services/familyWorkspacePurchaseService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';

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
      await refreshFamilyWorkspaceAfterPurchase({ sessionId });
    })();
  }, []);

  return null;
}
