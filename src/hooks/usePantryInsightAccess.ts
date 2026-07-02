import { useMemo } from 'react';

import { useDevFreeCartPreview } from '@/src/hooks/useDevFreeCartPreview';
import { useAdminStatus } from '@/src/hooks/useAdminStatus';
import {
  resolvePantryInsightAccess,
  type PantryInsightAccessResult,
} from '@/src/services/pantryInsightAccessLogic';
import { hasProInCurrentScopeFromStores } from '@/src/services/featureGateService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

/** Reactive pantry insight tier access (scope-aware + admin/DEV free preview). */
export function usePantryInsightAccess(): PantryInsightAccessResult {
  const tier = useSubscriptionStore((s) => s.tier);
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const hasActiveWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const isCurrentMember = useWorkspaceStore((s) => s.isCurrentMember);
  const isCurrentOwner = useWorkspaceStore((s) => s.isCurrentOwner);
  const hasPersonalPro = useSubscriptionStore((s) => s.isPro());
  const { isAdmin } = useAdminStatus();
  const { active: forceFreePreview } = useDevFreeCartPreview();

  return useMemo(
    () =>
      resolvePantryInsightAccess({
        isAdmin,
        tier,
        activeScope,
        hasPersonalPro,
        hasScopePro: hasProInCurrentScopeFromStores(),
        forceFreePreview,
      }),
    [
      isAdmin,
      tier,
      activeScope,
      hasPersonalPro,
      hasActiveWorkspaceSub,
      isCurrentMember,
      isCurrentOwner,
      forceFreePreview,
    ]
  );
}
