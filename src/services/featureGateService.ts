import { isAdminUser } from '@/src/services/admin/adminApiService';
import { FAMILY_PLAN_FEATURES, PRO_FEATURE_LABELS } from '@/src/constants/proPricing';

import { getTierLimits, tierAllowsFeature } from '@/src/constants/tierLimitsConfig';

import {
  isWorkspaceGatedFeature,
  type GatedFeature,
} from '@/src/services/featureGateLogic';
import { useSubscriptionStore, type SubscriptionTier } from '@/src/store/useSubscriptionStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

export type { GatedFeature } from '@/src/services/featureGateLogic';
export { isWorkspaceGatedFeature } from '@/src/services/featureGateLogic';

const FEATURE_LABELS: Record<GatedFeature, string> = PRO_FEATURE_LABELS;

export function getFeatureLabel(feature: GatedFeature): string {
  return FEATURE_LABELS[feature];
}

export function getRequiredTier(feature: GatedFeature): Exclude<SubscriptionTier, 'free'> | 'family' {
  return isWorkspaceGatedFeature(feature) ? 'family' : 'pro';
}

/** Personal Pro or trial — excludes family/workspace features. */
export function canAccessPersonalProFeature(feature: GatedFeature): boolean {
  if (isWorkspaceGatedFeature(feature)) return false;
  const effectiveTier = useSubscriptionStore.getState().getEffectiveTier();
  return tierAllowsFeature(feature, getTierLimits(effectiveTier));
}

/** Family/shared features — active workspace subscription AND membership. */
export function canAccessWorkspaceFeature(workspaceId?: string | null): boolean {
  const store = useWorkspaceStore.getState();
  const id = workspaceId ?? store.currentWorkspaceId;
  if (!id) return false;
  if (workspaceId && workspaceId !== store.currentWorkspaceId) {
    return false;
  }
  return store.hasActiveWorkspaceSub && store.isCurrentMember;
}

/** Check whether the current subscription unlocks a feature. */
export function canAccessFeature(feature: GatedFeature): boolean {
  if (isAdminUser()) return true;
  if (isWorkspaceGatedFeature(feature)) {
    return canAccessWorkspaceFeature();
  }
  return canAccessPersonalProFeature(feature);
}

export function getSubscriptionTier(): SubscriptionTier {
  return useSubscriptionStore.getState().getEffectiveTier();
}

export function getFamilyPlanFeatureLabels(): readonly string[] {
  return FAMILY_PLAN_FEATURES;
}
