import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Workspace, WorkspaceSubscriptionStatus } from '@/src/models/workspace';
import { isWorkspaceSubscriptionActive } from '@/src/services/workspaceSubscriptionLogic';
import { resolveAppUserId } from '@/src/services/authService';
import {
  getWorkspaceById,
  getWorkspaceMembers,
  listWorkspacesForUser,
} from '@/src/services/workspaceService';
import { supabase } from '@/src/services/supabaseClient';

const WORKSPACE_MOCK_KEY = '@pennypantry_workspace_sub_mock';

export { isWorkspaceSubscriptionActive } from '@/src/services/workspaceSubscriptionLogic';

export function workspaceHasActiveSubscription(workspace: Workspace | null | undefined): boolean {
  if (!workspace) return false;
  if (isWorkspaceSubscriptionActive(workspace.subscriptionStatus)) return true;
  return isWorkspaceMockSubActive(workspace.id);
}

function isWorkspaceMockSubActive(workspaceId: string): boolean {
  // Sync read not available — use store or async check; callers should use async version.
  void workspaceId;
  return false;
}

export async function isWorkspaceMockMode(): Promise<boolean> {
  if (process.env.EXPO_PUBLIC_WORKSPACE_USE_MOCK === 'true') return true;
  if (process.env.EXPO_PUBLIC_STRIPE_USE_MOCK === 'true') return true;
  return false;
}

export async function getWorkspaceMockSubscriptionIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(WORKSPACE_MOCK_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export async function setWorkspaceMockSubscription(workspaceId: string, active: boolean): Promise<void> {
  const ids = await getWorkspaceMockSubscriptionIds();
  if (active) {
    ids.add(workspaceId);
  } else {
    ids.delete(workspaceId);
  }
  await AsyncStorage.setItem(WORKSPACE_MOCK_KEY, JSON.stringify([...ids]));
}

export async function workspaceHasActiveSubscriptionAsync(
  workspace: Workspace | null | undefined
): Promise<boolean> {
  if (!workspace) return false;
  if (isWorkspaceSubscriptionActive(workspace.subscriptionStatus)) return true;
  if (await isWorkspaceMockMode()) {
    const mocks = await getWorkspaceMockSubscriptionIds();
    return mocks.has(workspace.id);
  }
  return false;
}

export async function isUserWorkspaceMember(workspaceId: string, userId?: string | null): Promise<boolean> {
  const uid = userId ?? (await resolveAppUserId());
  if (!uid) return false;
  if (workspaceId.startsWith('local_')) return true;

  const members = await getWorkspaceMembers(workspaceId);
  return members.some((m) => m.userId === uid);
}

/** Family/shared features: active workspace subscription AND user is a member. */
export async function canAccessWorkspaceFeatureAsync(workspaceId?: string | null): Promise<boolean> {
  if (!workspaceId) return false;

  const workspace = workspaceId.startsWith('local_')
    ? null
    : await getWorkspaceById(workspaceId);
  const localWorkspace: Workspace | null = workspaceId.startsWith('local_')
    ? {
        id: workspaceId,
        name: 'Household',
        ownerUserId: '',
        inviteCode: '',
        stripeSubscriptionId: null,
        subscriptionStatus: 'inactive',
        subscriptionPlan: null,
        currentPeriodEnd: null,
        createdAt: '',
        updatedAt: '',
      }
    : workspace;

  if (!(await isUserWorkspaceMember(workspaceId))) return false;

  if (localWorkspace && workspaceId.startsWith('local_')) {
    return isWorkspaceMockMode().then((mock) => mock && getWorkspaceMockSubscriptionIds().then((ids) => ids.has(workspaceId)));
  }

  return workspaceHasActiveSubscriptionAsync(workspace);
}

/** Sync check using workspace object from store (preferred in UI hooks). */
export function canAccessWorkspaceFeature(
  workspace: Workspace | null | undefined,
  isMember: boolean,
  mockActive?: boolean
): boolean {
  if (!workspace || !isMember) return false;
  if (isWorkspaceSubscriptionActive(workspace.subscriptionStatus)) return true;
  return mockActive === true;
}

export async function refreshWorkspaceSubscription(workspaceId: string): Promise<Workspace | null> {
  return getWorkspaceById(workspaceId);
}

export async function loadUserWorkspacesWithSubscription(): Promise<Workspace[]> {
  const userId = await resolveAppUserId();
  if (!userId) return [];
  return listWorkspacesForUser(userId);
}

type WorkspaceSubRow = {
  subscription_status: string;
  subscription_plan: 'monthly' | 'yearly' | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
};

/** Server/webhook helper — update workspace billing fields (service role). */
export async function patchWorkspaceSubscriptionFields(
  workspaceId: string,
  fields: Partial<WorkspaceSubRow>
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('workspaces')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', workspaceId);

  if (error) {
    console.warn('[workspaceSubscription] patch failed:', error.message);
  }
}
