import { useCallback } from 'react';
import { useRouter } from 'expo-router';

import {
  canAccessFeature,
  getFeatureLabel,
  getRequiredTier,
  isWorkspaceGatedFeature,
  type GatedFeature,
} from '@/src/services/featureGateService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import { promptUpgrade } from '@/src/utils/promptUpgrade';

export function useFeatureGate(feature: GatedFeature) {
  const tier = useSubscriptionStore((s) => s.tier);
  const hasWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const router = useRouter();
  const unlocked = canAccessFeature(feature);
  const requiredTier = getRequiredTier(feature);

  const requestAccess = useCallback(() => {
    if (canAccessFeature(feature)) return true;
    promptUpgrade({
      featureName: getFeatureLabel(feature),
      requiredTier: requiredTier === 'family' ? 'pro' : requiredTier,
      onUpgrade: () =>
        router.push(
          isWorkspaceGatedFeature(feature) ? ('/paywall?family=1' as never) : ('/paywall' as never)
        ),
    });
    return false;
  }, [feature, requiredTier, router]);

  return { unlocked, tier, requiredTier, hasWorkspaceSub, requestAccess };
}
