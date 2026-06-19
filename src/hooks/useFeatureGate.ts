import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import {
  canAccessFeature,
  getFeatureLabel,
  type ProFeature,
} from '@/src/services/featureGateService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { promptUpgrade } from '@/src/utils/promptUpgrade';

export function useFeatureGate(feature: ProFeature) {
  const tier = useSubscriptionStore((s) => s.tier);
  const router = useRouter();
  const unlocked = canAccessFeature(feature);

  const requestAccess = useCallback(() => {
    if (unlocked) return true;
    promptUpgrade({
      featureName: getFeatureLabel(feature),
      onUpgrade: () => router.push('/paywall' as never),
    });
    return false;
  }, [unlocked, feature, router]);

  return { unlocked, tier, requestAccess };
}
