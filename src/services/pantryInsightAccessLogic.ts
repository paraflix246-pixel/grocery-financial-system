import type { DataScope } from '@/src/models/workspace';
import type { SubscriptionTier } from '@/src/store/useSubscriptionStore';

import { resolveCartComparisonScopeProAccess } from '@/src/services/cartComparisonAccessLogic';

export type PantryInsightAccessInput = {
  isAdmin: boolean;
  tier: SubscriptionTier;
  activeScope: DataScope;
  hasPersonalPro: boolean;
  hasScopePro: boolean;
  /** DEV-only explicit toggle to preview free-tier pantry insights. */
  forceFreePreview?: boolean;
};

export type PantryInsightAccessResult = {
  hasFullAccess: boolean;
  forceFreePreview: boolean;
};

/**
 * Pantry insight access mirrors cart comparison scope rules plus admin free-tier preview:
 * - Personal scope: personal Pro/trial only (not family sub alone).
 * - Admin on free tier: limited teaser (validate monetization UX).
 * - DEV free preview toggle: limited teaser even for admin with Pro.
 */
export function resolvePantryInsightAccess(
  input: PantryInsightAccessInput
): PantryInsightAccessResult {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const tier = input.tier ?? 'free';
  const forceFreePreview = Boolean(
    (isDev && input.forceFreePreview) || (input.isAdmin && tier === 'free')
  );

  if (forceFreePreview) {
    return { hasFullAccess: false, forceFreePreview: true };
  }

  if (input.isAdmin) {
    return { hasFullAccess: true, forceFreePreview: false };
  }

  const scopePro = resolveCartComparisonScopeProAccess({
    activeScope: input.activeScope,
    hasPersonalPro: input.hasPersonalPro,
    hasScopePro: input.hasScopePro,
  });

  return { hasFullAccess: scopePro, forceFreePreview: false };
}
