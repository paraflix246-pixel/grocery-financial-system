import { create } from 'zustand';

import type { DataScope, Workspace, WorkspaceMember } from '@/src/models/workspace';
import { resolveAppUserId } from '@/src/services/authService';
import {
  getDevFamilyRoleOverride,
  getDevFamilyRoleOverrideSync,
} from '@/src/services/devFamilyRolePreview';
import { isWorkspaceOwner } from '@/src/services/featureGateScopeLogic';
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
  currentUserId: string | null;
  isCurrentOwner: boolean;
  activeScope: DataScope;
  mockSubWorkspaceIds: Set<string>;
  isCurrentMember: boolean;
  hasActiveWorkspaceSub: boolean;
  familyWorkspaceReady: boolean;
  devRoleOverride: 'owner' | 'member' | null;
  loadWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspaceId: string | null) => Promise<void>;
  setActiveScope: (scope: DataScope) => Promise<void>;
  refreshCurrentWorkspace: () => Promise<void>;
  refreshAfterFamilyPurchase: () => Promise<boolean>;
  refreshDevRoleOverride: () => Promise<void>;
  resetForSignOut: () => Promise<void>;
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

function deriveOwnerState(
  workspace: Workspace | null,
  members: WorkspaceMember[],
  userId: string | null,
  devRoleOverride: 'owner' | 'member' | null
): boolean {
  let isOwner = isWorkspaceOwner(userId, workspace, members);
  if (__DEV__ && devRoleOverride === 'member') isOwner = false;
  if (__DEV__ && devRoleOverride === 'owner') isOwner = true;
  return isOwner;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  loaded: false,
  workspaces: [],
  currentWorkspaceId: null,
  currentWorkspace: null,
  members: [],
  currentUserId: null,
  isCurrentOwner: false,
  activeScope: 'personal',
  mockSubWorkspaceIds: new Set(),
  isCurrentMember: false,
  hasActiveWorkspaceSub: false,
  familyWorkspaceReady: false,
  devRoleOverride: __DEV__ ? getDevFamilyRoleOverrideSync() : null,

  refreshDevRoleOverride: async () => {
    if (!__DEV__) return;
    const devRoleOverride = await getDevFamilyRoleOverride();
    const { currentWorkspace, members, currentUserId } = get();
    set({
      devRoleOverride,
      isCurrentOwner: deriveOwnerState(currentWorkspace, members, currentUserId, devRoleOverride),
    });
  },

  loadWorkspaces: async () => {
    const userId = await resolveAppUserId();
    const devRoleOverride = __DEV__ ? await getDevFamilyRoleOverride() : null;
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
    const isCurrentOwner = deriveOwnerState(currentWorkspace, members, userId, devRoleOverride);
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
      currentUserId: userId,
      isCurrentOwner,
      devRoleOverride,
      activeScope,
      mockSubWorkspaceIds: mockIds,
      isCurrentMember,
      hasActiveWorkspaceSub,
    });
  },

  setCurrentWorkspace: async (workspaceId) => {
    const { workspaces, mockSubWorkspaceIds, devRoleOverride } = get();
    const userId = await resolveAppUserId();
    const currentWorkspace = workspaceId
      ? workspaces.find((w) => w.id === workspaceId) ?? null
      : null;
    await setStoredCurrentWorkspaceId(workspaceId);

    const members = workspaceId ? await getWorkspaceMembers(workspaceId) : [];
    const isCurrentMember = deriveMembership(workspaceId, members, userId);
    const isCurrentOwner = deriveOwnerState(currentWorkspace, members, userId, devRoleOverride);
    const hasActiveWorkspaceSub = canAccessWorkspaceFeature(
      currentWorkspace,
      isCurrentMember,
      workspaceId ? mockSubWorkspaceIds.has(workspaceId) : false
    );

    set({
      currentWorkspaceId: workspaceId,
      currentWorkspace,
      members,
      currentUserId: userId,
      isCurrentOwner,
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
    const { invalidateScopedReceiptsCache } = await import('@/src/services/scopedReceiptService');
    invalidateScopedReceiptsCache();
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
    const isCurrentOwner = deriveOwnerState(currentWorkspace, members, userId, get().devRoleOverride);
    const hasActiveWorkspaceSub = await workspaceHasActiveSubscriptionAsync(currentWorkspace);
    const mockActive = mockIds.has(currentWorkspaceId);

    set({
      workspaces,
      currentWorkspace,
      members,
      currentUserId: userId,
      isCurrentOwner,
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

  resetForSignOut: async () => {
    await Promise.all([setStoredCurrentWorkspaceId(null), setStoredActiveScope('personal')]);
    set({
      loaded: false,
      workspaces: [],
      currentWorkspaceId: null,
      currentWorkspace: null,
      members: [],
      currentUserId: null,
      isCurrentOwner: false,
      activeScope: 'personal',
      mockSubWorkspaceIds: new Set(),
      isCurrentMember: false,
      hasActiveWorkspaceSub: false,
      familyWorkspaceReady: false,
      devRoleOverride: __DEV__ ? getDevFamilyRoleOverrideSync() : null,
    });
  },
}));

export function activeDataScopeFromStore(): DataScope {
  return useWorkspaceStore.getState().activeScope;
}

export function currentWorkspaceIdFromStore(): string | null {
  return useWorkspaceStore.getState().currentWorkspaceId;
}
