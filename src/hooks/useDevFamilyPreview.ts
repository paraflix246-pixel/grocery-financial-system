import { useCallback, useEffect, useState } from 'react';

import {
  isDevFamilyWorkspacePreviewActive,
  isDevFamilyWorkspacePreviewActiveSync,
} from '@/src/services/devFamilyWorkspacePreview';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

/** DEV-only: whether the mock Household subscription preview is active. */
export function useDevFamilyPreview() {
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const hasActiveWorkspaceSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const mockSubWorkspaceIds = useWorkspaceStore((s) => s.mockSubWorkspaceIds);
  const [active, setActive] = useState(() => isDevFamilyWorkspacePreviewActiveSync());

  const refresh = useCallback(async () => {
    if (!__DEV__) {
      setActive(false);
      return;
    }
    setActive(await isDevFamilyWorkspacePreviewActive());
  }, []);

  useEffect(() => {
    if (!__DEV__) {
      setActive(false);
      return;
    }
    setActive(isDevFamilyWorkspacePreviewActiveSync());
    void refresh();
  }, [currentWorkspaceId, hasActiveWorkspaceSub, mockSubWorkspaceIds, refresh]);

  return { active, refresh };
}
