import { useCallback, useMemo } from 'react';

import { useRouter } from 'expo-router';



import {

  canAccessFeature,

  getFeatureLabel,

  getRequiredTier,

  hasProInCurrentScopeFromStores,

  isWorkspaceGatedFeature,

  shouldShowProUpgradeBanner,

  type GatedFeature,

} from '@/src/services/featureGateService';

import { useAdminStatus } from '@/src/hooks/useAdminStatus';
import { useDevFreeCartPreview } from '@/src/hooks/useDevFreeCartPreview';

import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';

import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

import { promptUpgrade } from '@/src/utils/promptUpgrade';

import { buildPaywallHref } from '@/src/utils/paywallRoutes';



export function useFeatureGate(feature: GatedFeature) {

  const tier = useSubscriptionStore((s) => s.tier);

  const activeScope = useWorkspaceStore((s) => s.activeScope);

  const isCurrentOwner = useWorkspaceStore((s) => s.isCurrentOwner);

  const hasActiveWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);

  const isCurrentMember = useWorkspaceStore((s) => s.isCurrentMember);

  const devRoleOverride = useWorkspaceStore((s) => s.devRoleOverride);

  const router = useRouter();



  const scopePro = hasProInCurrentScopeFromStores();

  const unlocked = canAccessFeature(feature);

  const requiredTier = getRequiredTier(feature);



  const requestAccess = useCallback(() => {

    if (canAccessFeature(feature)) return true;

    promptUpgrade({

      featureName: getFeatureLabel(feature),

      requiredTier: requiredTier === 'family' ? 'pro' : requiredTier,

      onUpgrade: () =>

        router.push(

          isWorkspaceGatedFeature(feature) ? (buildPaywallHref('family') as never) : (buildPaywallHref() as never)

        ),

    });

    return false;

  }, [feature, requiredTier, router]);



  return {

    unlocked,

    tier,

    requiredTier,

    hasWorkspaceSub: hasActiveWorkspaceSub,

    scopePro,

    activeScope,

    isCurrentOwner,

    isCurrentMember,

    requestAccess,

  };

}

/** Reactive Pro upgrade banner visibility (guests, free, and non-Pro signed-in users). */
export function useShouldShowProUpgradeBanner(): boolean {
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const isCurrentMember = useWorkspaceStore((s) => s.isCurrentMember);
  const isCurrentOwner = useWorkspaceStore((s) => s.isCurrentOwner);
  const hasActiveWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const devRoleOverride = useWorkspaceStore((s) => s.devRoleOverride);
  const tier = useSubscriptionStore((s) => s.tier);
  const subscriptionSource = useSubscriptionStore((s) => s.subscriptionSource);
  const { isAdmin } = useAdminStatus();
  const { active: forceFreePreview } = useDevFreeCartPreview();

  return useMemo(
    () =>
      shouldShowProUpgradeBanner({
        isAdmin,
        scopePro: hasProInCurrentScopeFromStores(),
        tier,
        forceFreePreview,
      }),
    [
      activeScope,
      devRoleOverride,
      forceFreePreview,
      hasActiveWorkspaceSub,
      isAdmin,
      isCurrentMember,
      isCurrentOwner,
      subscriptionSource,
      tier,
    ]
  );
}

