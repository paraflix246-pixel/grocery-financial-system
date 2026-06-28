import { create } from 'zustand';

import type { DataScope, Workspace, WorkspaceMember } from '@/src/models/workspace';
import { resolveAppUserId } from '@/src/services/authService';
import {
  canAccessWorkspaceFeature,
  getWorkspaceMockSubscriptionIds,
  workspaceHasActiveSubscriptionAsync,
} from '@/src/services/workspaceSubscriptionService';
import {
  ensureCurrentWorkspace,
  getStoredActiveScope,
  getStoredCurrentWorkspaceId,
  getWorkspaceMembers,
  listWorkspacesForUser,
  setStoredActiveScope,
  setStoredCurrentWorkspaceId,
} from '@/src/services/workspaceService';

type WorkspaceStore = {
  loaded: boolean;
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  activeScope: DataScope;
  mockSubWorkspaceIds: Set<string>;
  isCurrentMember: boolean;
  hasActiveWorkspaceSub: boolean;
  familyWorkspaceReady: boolean;
  loadWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspaceId: string | null) => Promise<void>;
  setActiveScope: (scope: DataScope) => Promise<void>;
  refreshCurrentWorkspace: () => Promise<void>;
  refreshAfterFamilyPurchase: () => Promise<boolean>;
};

function deriveMembership(
  workspaceId: string | null,
  members: WorkspaceMember[],
  userId: string | null
): boolean {
  if (!workspaceId || !userId) return false;
  if (workspaceId.startsWith('local_')) return true;
  return members.some((m) => m.userId === userId);
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  loaded: false,
  workspaces: [],
  currentWorkspaceId: null,
  currentWorkspace: null,
  members: [],
  activeScope: 'personal',
  mockSubWorkspaceIds: new Set(),
  isCurrentMember: false,
  hasActiveWorkspaceSub: false,
  familyWorkspaceReady: false,

  loadWorkspaces: async () => {
    const userId = await resolveAppUserId();
    const [workspaces, storedWorkspaceId, storedScope, mockIds] = await Promise.all([
      userId ? listWorkspacesForUser(userId) : Promise.resolve([]),
      getStoredCurrentWorkspaceId(),
      getStoredActiveScope(),
      getWorkspaceMockSubscriptionIds(),
    ]);

    let currentWorkspaceId = storedWorkspaceId;
    let currentWorkspace: Workspace | null = null;

    if (currentWorkspaceId) {
      currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
    }
    if (!currentWorkspace && workspaces.length > 0) {
      currentWorkspace = workspaces[0]!;
      currentWorkspaceId = currentWorkspace.id;
      await setStoredCurrentWorkspaceId(currentWorkspaceId);
    }
    if (!currentWorkspace && currentWorkspaceId?.startsWith('local_')) {
      currentWorkspace = await ensureCurrentWorkspace();
    }

    const members = currentWorkspaceId ? await getWorkspaceMembers(currentWorkspaceId) : [];
    const isCurrentMember = deriveMembership(currentWorkspaceId, members, userId);
    const hasActiveWorkspaceSub = canAccessWorkspaceFeature(
      currentWorkspace,
      isCurrentMember,
      currentWorkspaceId ? mockIds.has(currentWorkspaceId) : false
    );

    const activeScope =
      storedScope === 'workspace' && currentWorkspace && isCurrentMember ? 'workspace' : 'personal';

    set({
      loaded: true,
      workspaces,
      currentWorkspaceId,
      currentWorkspace,
      members,
      activeScope,
      mockSubWorkspaceIds: mockIds,
      isCurrentMember,
      hasActiveWorkspaceSub,
    });
  },

  setCurrentWorkspace: async (workspaceId) => {
    const { workspaces, mockSubWorkspaceIds } = get();
    const userId = await resolveAppUserId();
    const currentWorkspace = workspaceId
      ? workspaces.find((w) => w.id === workspaceId) ?? null
      : null;
    await setStoredCurrentWorkspaceId(workspaceId);

    const members = workspaceId ? await getWorkspaceMembers(workspaceId) : [];
    const isCurrentMember = deriveMembership(workspaceId, members, userId);
    const hasActiveWorkspaceSub = canAccessWorkspaceFeature(
      currentWorkspace,
      isCurrentMember,
      workspaceId ? mockSubWorkspaceIds.has(workspaceId) : false
    );

    set({
      currentWorkspaceId: workspaceId,
      currentWorkspace,
      members,
      isCurrentMember,
      hasActiveWorkspaceSub,
      activeScope: workspaceId && isCurrentMember ? get().activeScope : 'personal',
    });
  },

  setActiveScope: async (scope) => {
    const { currentWorkspace, isCurrentMember } = get();
    const nextScope =
      scope === 'workspace' && currentWorkspace && isCurrentMember ? 'workspace' : 'personal';
    await setStoredActiveScope(nextScope);
    set({ activeScope: nextScope });
  },

  refreshCurrentWorkspace: async () => {
    const { currentWorkspaceId } = get();
    if (!currentWorkspaceId) return;

    const userId = await resolveAppUserId();
    const workspaces = userId ? await listWorkspacesForUser(userId) : [];
    const currentWorkspace =
      workspaces.find((w) => w.id === currentWorkspaceId) ??
      (currentWorkspaceId.startsWith('local_') ? await ensureCurrentWorkspace() : null);
    const members = await getWorkspaceMembers(currentWorkspaceId);
    const mockIds = await getWorkspaceMockSubscriptionIds();
    const isCurrentMember = deriveMembership(currentWorkspaceId, members, userId);
    const hasActiveWorkspaceSub = await workspaceHasActiveSubscriptionAsync(currentWorkspace);
    const mockActive = mockIds.has(currentWorkspaceId);

    set({
      workspaces,
      currentWorkspace,
      members,
      mockSubWorkspaceIds: mockIds,
      isCurrentMember,
      hasActiveWorkspaceSub: hasActiveWorkspaceSub || (mockActive && isCurrentMember),
    });
  },

  refreshAfterFamilyPurchase: async () => {
    await get().loadWorkspaces();
    await get().refreshCurrentWorkspace();
    await get().setActiveScope('workspace');
    const { hasActiveWorkspaceSub, isCurrentMember } = get();
    const ready = hasActiveWorkspaceSub && isCurrentMember;
    set({ familyWorkspaceReady: ready });
    return ready;
  },
}));

export function activeDataScopeFromStore(): DataScope {
  return useWorkspaceStore.getState().activeScope;
}

export function currentWorkspaceIdFromStore(): string | null {
  return useWorkspaceStore.getState().currentWorkspaceId;
}
