import { useMemo } from 'react';

import { useDevFreeCartPreview } from '@/src/hooks/useDevFreeCartPreview';
import { useAdminStatus } from '@/src/hooks/useAdminStatus';
import {
  getCartComparisonAccess,
  type CartComparisonAccessResult,
} from '@/src/services/cartComparisonAccessService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

/** Reactive cart-comparison tier access (respects admin, Pro, and DEV free preview). */
export function useCartComparisonAccess(): CartComparisonAccessResult {
  const tier = useSubscriptionStore((s) => s.tier);
  const subscriptionSource = useSubscriptionStore((s) => s.subscriptionSource);
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const hasActiveWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const isCurrentMember = useWorkspaceStore((s) => s.isCurrentMember);
  const isCurrentOwner = useWorkspaceStore((s) => s.isCurrentOwner);
  const { isAdmin } = useAdminStatus();
  const { active: forceFreeCartPreview } = useDevFreeCartPreview();

  return useMemo(
    () =>
      getCartComparisonAccess({
        isAdmin,
        tier,
        subscriptionSource,
        activeScope,
        forceFreeCartPreview,
      }),
    [
      isAdmin,
      tier,
      subscriptionSource,
      activeScope,
      hasActiveWorkspaceSub,
      isCurrentMember,
      isCurrentOwner,
      forceFreeCartPreview,
    ]
  );
}
