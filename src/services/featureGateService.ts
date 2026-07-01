import { isAdminUser } from '@/src/services/admin/adminApiService';
import { FAMILY_PLAN_FEATURES, PRO_FEATURE_LABELS } from '@/src/constants/proPricing';

import { getTierLimits, tierAllowsFeature } from '@/src/constants/tierLimitsConfig';

import {
  isWorkspaceGatedFeature,
  type GatedFeature,
} from '@/src/services/featureGateLogic';
import {
  getDevFamilyRoleOverrideSync,
} from '@/src/services/devFamilyRolePreview';
import {
  hasProInCurrentScope,
  hasWorkspaceFeatureInCurrentScope,
  isWorkspaceOwner,
  type ProScopeContext,
} from '@/src/services/featureGateScopeLogic';
import { useSubscriptionStore, type SubscriptionTier } from '@/src/store/useSubscriptionStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

export type { GatedFeature } from '@/src/services/featureGateLogic';
export { isWorkspaceGatedFeature } from '@/src/services/featureGateLogic';
export {
  hasProInCurrentScope,
  hasWorkspaceFeatureInCurrentScope,
  isWorkspaceOwner,
  type ProScopeContext,
} from '@/src/services/featureGateScopeLogic';

const FEATURE_LABELS: Record<GatedFeature, string> = PRO_FEATURE_LABELS;

export function getFeatureLabel(feature: GatedFeature): string {
  return FEATURE_LABELS[feature];
}

export function getRequiredTier(feature: GatedFeature): Exclude<SubscriptionTier, 'free'> | 'family' {
  return isWorkspaceGatedFeature(feature) ? 'family' : 'pro';
}

/** Build scope context from current Zustand stores (sync). */
export function getProScopeContext(): ProScopeContext {
  const workspaceStore = useWorkspaceStore.getState();
  const { currentWorkspace, members, currentUserId, activeScope, isCurrentMember, hasActiveWorkspaceSub } =
    workspaceStore;

  let isOwner = isWorkspaceOwner(currentUserId, currentWorkspace, members);
  if (__DEV__) {
    const roleOverride = getDevFamilyRoleOverrideSync();
    if (roleOverride === 'member') isOwner = false;
    if (roleOverride === 'owner') isOwner = true;
  }

  return {
    activeScope,
    isWorkspaceOwner: isOwner,
    isCurrentMember,
    hasActiveWorkspaceSub,
    hasPersonalPro: useSubscriptionStore.getState().isPro(),
  };
}

/** Whether Pro perks apply in the current Personal | Family workspace scope. */
export function hasProInCurrentScopeFromStores(): boolean {
  return hasProInCurrentScope(getProScopeContext());
}

/** Personal Pro or trial — scope-aware; excludes workspace-only features. */
export function canAccessPersonalProFeature(feature: GatedFeature): boolean {
  if (isWorkspaceGatedFeature(feature)) return false;

  if (!hasProInCurrentScopeFromStores()) {
    return false;
  }

  return tierAllowsFeature(feature, getTierLimits('pro'));
}

/** Family/shared features — active workspace subscription, membership, and scope rules. */
export function canAccessWorkspaceFeature(workspaceId?: string | null): boolean {
  const store = useWorkspaceStore.getState();
  const id = workspaceId ?? store.currentWorkspaceId;
  if (!id) return false;
  if (workspaceId && workspaceId !== store.currentWorkspaceId) {
    return false;
  }
  return hasWorkspaceFeatureInCurrentScope(getProScopeContext());
}

/** Check whether the current subscription unlocks a feature. */
export function canAccessFeature(feature: GatedFeature): boolean {
  if (isAdminUser()) return true;
  if (isWorkspaceGatedFeature(feature)) {
    return canAccessWorkspaceFeature();
  }
  return canAccessPersonalProFeature(feature);
}

/** Whether the current scope unlocks full cart comparison rotation (all list items). */
export function hasFullCartComparisonAccess(): boolean {
  return canAccessFeature('cheapest_basket');
}

export function getSubscriptionTier(): SubscriptionTier {
  return useSubscriptionStore.getState().getEffectiveTier();
}

export function getFamilyPlanFeatureLabels(): readonly string[] {
  return FAMILY_PLAN_FEATURES;
}
