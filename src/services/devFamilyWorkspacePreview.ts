import type { Href } from 'expo-router';

import { resolveAppUserId } from '@/src/services/authService';
import { createWorkspace, ensureCurrentWorkspace } from '@/src/services/workspaceService';
import {
  getWorkspaceMockSubscriptionIds,
  setWorkspaceMockSubscription,
} from '@/src/services/workspaceSubscriptionService';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

export const DEV_FAMILY_WORKSPACE_ROUTE = '/dev/family-workspace' as const;

export type DevFamilyPreviewDestination = 'home' | 'family_plans';

/** DEV-only: simulate Household purchase — creates workspace, enables mock sub, switches scope. */
export async function enableDevFamilyWorkspacePreview(): Promise<boolean> {
  const userId = await resolveAppUserId();
  if (!userId) return false;

  try {
    let workspace = await ensureCurrentWorkspace();
    if (!workspace) {
      workspace = await createWorkspace('My Household');
    }

    await setWorkspaceMockSubscription(workspace.id, true);
    await useWorkspaceStore.getState().loadWorkspaces();
    await useWorkspaceStore.getState().refreshCurrentWorkspace();
    await useWorkspaceStore.getState().setActiveScope('workspace');

    const { hasActiveWorkspaceSub, isCurrentMember } = useWorkspaceStore.getState();
    return hasActiveWorkspaceSub && isCurrentMember;
  } catch (error) {
    console.warn('[devFamilyPreview] enable failed:', error);
    return false;
  }
}

/** DEV-only: turn off mock Household subscription and return to Personal scope. */
export async function disableDevFamilyWorkspacePreview(): Promise<void> {
  const { currentWorkspaceId } = useWorkspaceStore.getState();
  if (currentWorkspaceId) {
    await setWorkspaceMockSubscription(currentWorkspaceId, false);
  }
  await useWorkspaceStore.getState().setActiveScope('personal');
  await useWorkspaceStore.getState().loadWorkspaces();
}

export async function isDevFamilyWorkspacePreviewActive(): Promise<boolean> {
  const { currentWorkspaceId, hasActiveWorkspaceSub } = useWorkspaceStore.getState();
  if (!currentWorkspaceId || !hasActiveWorkspaceSub) return false;
  const ids = await getWorkspaceMockSubscriptionIds();
  return ids.has(currentWorkspaceId);
}

export function isDevFamilyWorkspacePreviewActiveSync(): boolean {
  if (!__DEV__) return false;
  const { currentWorkspaceId, hasActiveWorkspaceSub, mockSubWorkspaceIds } =
    useWorkspaceStore.getState();
  return Boolean(
    currentWorkspaceId && hasActiveWorkspaceSub && mockSubWorkspaceIds.has(currentWorkspaceId)
  );
}

type PreviewNavigateRouter = {
  replace: (href: Href) => void;
};

/** Enable preview and navigate — no Stripe. Returns false when sign-in is required. */
export async function startDevFamilyWorkspacePreview(
  router: PreviewNavigateRouter,
  destination: DevFamilyPreviewDestination = 'home'
): Promise<boolean> {
  const ready = await enableDevFamilyWorkspacePreview();
  if (!ready) return false;

  const href: Href = destination === 'family_plans' ? '/family_plans' : '/(tabs)';
  router.replace(href);
  return true;
}
