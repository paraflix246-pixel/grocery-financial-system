import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { isAdminUser, syncUserProfile } from '@/src/services/admin/adminApiService';
import { resolveAdminPaywallBypassRoute } from '@/src/services/postAuthRoutingLogic';
import { useBudgetStore } from '@/src/store/useBudgetStore';

/**
 * Redirects admin users away from paywall / onboarding upgrade screens.
 */
export function useAdminPaywallBypass(): void {
  const router = useRouter();
  const completeOnboarding = useBudgetStore((s) => s.completeOnboarding);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await syncUserProfile();
      if (cancelled || !isAdminUser()) return;

      await completeOnboarding();
      const platform = Platform.OS === 'web' ? 'web' : 'native';
      router.replace(resolveAdminPaywallBypassRoute(platform) as Href);
    })();

    return () => {
      cancelled = true;
    };
  }, [completeOnboarding, router]);
}
