import { tierAllowsFeature, getTierLimits } from '@/src/constants/tierLimitsConfig';
import { isAdminUser } from '@/src/services/admin/adminApiService';
import {
  resolveCartComparisonAccess,
  resolveCartComparisonScopeProAccess,
  type CartComparisonAccessInput,
  type CartComparisonAccessResult,
} from '@/src/services/cartComparisonAccessLogic';
import { isDevForceFreeCartPreviewActiveSync } from '@/src/services/devFreeCartPreview';
import {
  getSubscriptionTier,
  hasProInCurrentScopeFromStores,
} from '@/src/services/featureGateService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

export type {
  CartComparisonAccessInput,
  CartComparisonAccessReason,
  CartComparisonAccessResult,
} from '@/src/services/cartComparisonAccessLogic';
export { resolveCartComparisonAccess, resolveCartComparisonScopeProAccess } from '@/src/services/cartComparisonAccessLogic';

type CartComparisonAccessOverrides = Partial<
  Pick<
    CartComparisonAccessInput,
    | 'isAdmin'
    | 'tier'
    | 'subscriptionSource'
    | 'hasPersonalProScope'
    | 'activeScope'
    | 'hasPersonalPro'
    | 'hasScopePro'
    | 'forceFreeCartPreview'
  >
>;

/** Current cart-comparison access from live stores (sync). */
export function getCartComparisonAccess(
  overrides: CartComparisonAccessOverrides = {}
): CartComparisonAccessResult {
  const isAdmin = overrides.isAdmin ?? isAdminUser();
  const tier = overrides.tier ?? getSubscriptionTier();
  const subscriptionSource =
    overrides.subscriptionSource ?? useSubscriptionStore.getState().subscriptionSource;
  const activeScope =
    overrides.activeScope ?? useWorkspaceStore.getState().activeScope;
  const hasPersonalPro =
    overrides.hasPersonalPro ?? useSubscriptionStore.getState().isPro();
  const hasScopePro =
    overrides.hasScopePro ?? hasProInCurrentScopeFromStores();
  const forceFreeCartPreview =
    overrides.forceFreeCartPreview ?? isDevForceFreeCartPreviewActiveSync();

  const scopePro = resolveCartComparisonScopeProAccess({
    activeScope,
    hasPersonalPro,
    hasScopePro,
  });
  const proFeatureAllowed =
    scopePro && tierAllowsFeature('cheapest_basket', getTierLimits('pro'));

  return resolveCartComparisonAccess({
    isAdmin,
    tier,
    subscriptionSource,
    hasPersonalProScope: proFeatureAllowed,
    activeScope,
    hasPersonalPro,
    hasScopePro,
    forceFreeCartPreview,
  });
}
