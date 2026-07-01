import type { DataScope } from '@/src/models/workspace';
import type { SubscriptionSource, SubscriptionTier } from '@/src/store/useSubscriptionStore';

export type CartComparisonAccessReason =
  | 'free'
  | 'admin'
  | 'pro'
  | 'trial'
  | 'family'
  | 'dev_free_preview';

export type CartComparisonAccessInput = {
  isAdmin: boolean;
  tier: SubscriptionTier;
  subscriptionSource: SubscriptionSource;
  /** Scope-aware Pro for cart comparison (personal sub vs workspace sub). */
  hasPersonalProScope: boolean;
  activeScope?: DataScope;
  /** Personal Pro/trial subscription — not workspace-derived. */
  hasPersonalPro?: boolean;
  /** Pro in current scope from featureGateScopeLogic (includes household sub). */
  hasScopePro?: boolean;
  /** DEV-only explicit toggle; when omitted, uses sync cache flag from caller. */
  forceFreeCartPreview?: boolean;
  /** DEV-only: admin + free dev tier auto-preview. Computed by caller when omitted. */
  adminDevFreeOverride?: boolean;
};

/**
 * Cart comparison uses stricter scope rules than general Pro perks:
 * - Personal scope: only a personal Pro/trial subscription unlocks full rotation.
 * - Workspace scope: household Pro (leader or member with active sub) unlocks full rotation.
 */
export function resolveCartComparisonScopeProAccess(input: {
  activeScope: DataScope;
  hasPersonalPro: boolean;
  hasScopePro: boolean;
}): boolean {
  if (input.activeScope === 'personal') {
    return input.hasPersonalPro;
  }
  return input.hasScopePro;
}

export type CartComparisonAccessResult = {
  hasFullAccess: boolean;
  isAdmin: boolean;
  tier: SubscriptionTier;
  forceFreePreview: boolean;
  accessReason: CartComparisonAccessReason;
};

/** Pure cart-comparison access — pass all fields explicitly (tests + runtime wrapper). */
export function resolveCartComparisonAccess(
  input: CartComparisonAccessInput
): CartComparisonAccessResult {
  const {
    isAdmin,
    tier,
    subscriptionSource,
    hasPersonalProScope,
    forceFreeCartPreview = false,
    adminDevFreeOverride = isAdmin && tier === 'free',
  } = input;

  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const forceFreePreview = Boolean(
    isDev && (forceFreeCartPreview || adminDevFreeOverride)
  );

  if (forceFreePreview) {
    return {
      hasFullAccess: false,
      isAdmin,
      tier,
      forceFreePreview: true,
      accessReason: 'dev_free_preview',
    };
  }

  if (isAdmin) {
    return {
      hasFullAccess: true,
      isAdmin,
      tier,
      forceFreePreview: false,
      accessReason: 'admin',
    };
  }

  if (hasPersonalProScope) {
    let accessReason: CartComparisonAccessReason = 'pro';
    if (subscriptionSource === 'trial') {
      accessReason = 'trial';
    } else if (tier === 'free') {
      accessReason = 'family';
    }
    return {
      hasFullAccess: true,
      isAdmin,
      tier,
      forceFreePreview: false,
      accessReason,
    };
  }

  return {
    hasFullAccess: false,
    isAdmin,
    tier,
    forceFreePreview: false,
    accessReason: 'free',
  };
}
