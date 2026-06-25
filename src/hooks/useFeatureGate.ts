import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import {
  canAccessFeature,
  getFeatureLabel,
  getRequiredTier,
  type GatedFeature,
} from '@/src/services/featureGateService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { promptUpgrade } from '@/src/utils/promptUpgrade';

export function useFeatureGate(feature: GatedFeature) {
  const tier = useSubscriptionStore((s) => s.tier);
  const router = useRouter();
  const unlocked = canAccessFeature(feature);
  const requiredTier = getRequiredTier(feature);

  const requestAccess = useCallback(() => {
    if (canAccessFeature(feature)) return true;
    promptUpgrade({
      featureName: getFeatureLabel(feature),
      requiredTier,
      onUpgrade: () => router.push('/paywall' as never),
    });
    return false;
  }, [feature, requiredTier, router]);

  return { unlocked, tier, requiredTier, requestAccess };
}
