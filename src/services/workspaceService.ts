import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/src/models/workspace';
import { generateFamilyCode, normalizeFamilyCode } from '@/src/services/familyCodeLogic';
import { getInviteUrl } from '@/src/services/familyCodeService';
import { resolveAppUserId } from '@/src/services/authService';
import { supabase } from '@/src/services/supabaseClient';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import {
  isUserWorkspaceMember,
  workspaceHasActiveSubscription,
} from '@/src/services/workspaceSubscriptionService';
import {
  WorkspaceJoinError,
  type JoinWorkspaceOutcome,
} from '@/src/services/workspaceJoinErrors';

export { WorkspaceJoinError, type JoinWorkspaceOutcome } from '@/src/services/workspaceJoinErrors';

const CURRENT_WORKSPACE_KEY = '@pennypantry_current_workspace_id';
const ACTIVE_SCOPE_KEY = '@pennypantry_active_scope';

type WorkspaceRow = {
  id: string;
  name: string;
  owner_user_id: string;
  invite_code: string;
  stripe_subscription_id: string | null;
  subscription_status: string;
  subscription_plan: 'monthly' | 'yearly' | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  display_name: string | null;
  joined_at: string;
};

function mapWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    inviteCode: row.invite_code,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status as Workspace['subscriptionStatus'],
    subscriptionPlan: row.subscription_plan,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: MemberRow): WorkspaceMember {
  return {
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
    joinedAt: row.joined_at,
  };
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('could not find the table') || (msg.includes('relation') && msg.includes('does not exist'));
}

function memberDisplayName(): string {
  const name = useSettingsStore.getState().settings?.displayName?.trim();
  return name || 'Household member';
}

export async function getStoredCurrentWorkspaceId(): Promise<string | null> {
  return AsyncStorage.getItem(CURRENT_WORKSPACE_KEY);
}

export async function setStoredCurrentWorkspaceId(workspaceId: string | null): Promise<void> {
  if (workspaceId) {
    await AsyncStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId);
  } else {
    await AsyncStorage.removeItem(CURRENT_WORKSPACE_KEY);
  }
}

export async function getStoredActiveScope(): Promise<'personal' | 'workspace'> {
  const raw = await AsyncStorage.getItem(ACTIVE_SCOPE_KEY);
  return raw === 'workspace' ? 'workspace' : 'personal';
}

export async function setStoredActiveScope(scope: 'personal' | 'workspace'): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_SCOPE_KEY, scope);
}

export async function listWorkspacesForUser(userId: string): Promise<Workspace[]> {
  if (!supabase) return [];

  const { data: memberships, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId);

  if (memberError) {
    if (isMissingTableError(memberError)) return [];
    throw new Error(memberError.message);
  }

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id as string);
  if (workspaceIds.length === 0) return [];

  const { data, error } = await supabase.from('workspaces').select('*').in('id', workspaceIds);
  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return (data as WorkspaceRow[]).map(mapWorkspace);
}

export async function getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.from('workspaces').select('*').eq('id', workspaceId).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(error.message);
  }
  return data ? mapWorkspace(data as WorkspaceRow) : null;
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw new Error(error.message);
  }

  return (data as MemberRow[]).map(mapMember);
}

async function registerWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<void> {
  if (!supabase) return;

  await supabase.from('workspace_members').upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      role,
      display_name: memberDisplayName(),
    },
    { onConflict: 'workspace_id,user_id' }
  );
}

export async function createWorkspace(name?: string): Promise<Workspace> {
  const userId = await resolveAppUserId();
  if (!userId) throw new Error('Sign in to create a household workspace.');

  const workspaceName = name?.trim() || 'My Household';
  const inviteCode = generateFamilyCode();

  if (!supabase) {
    const localId = `local_ws_${inviteCode.replace('-', '')}`;
    const now = new Date().toISOString();
    const local: Workspace = {
      id: localId,
      name: workspaceName,
      ownerUserId: userId,
      inviteCode,
      stripeSubscriptionId: null,
      subscriptionStatus: 'inactive',
      subscriptionPlan: null,
      currentPeriodEnd: null,
      createdAt: now,
      updatedAt: now,
    };
    await setStoredCurrentWorkspaceId(localId);
    return local;
  }

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      name: workspaceName,
      owner_user_id: userId,
      invite_code: inviteCode,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      throw new Error('Workspace tables are not set up. Run supabase/migrations/006_workspaces.sql.');
    }
    throw new Error(error.message);
  }

  const workspace = mapWorkspace(data as WorkspaceRow);
  await registerWorkspaceMember(workspace.id, userId, 'owner');
  await setStoredCurrentWorkspaceId(workspace.id);
  return workspace;
}

export async function joinWorkspaceByCode(rawCode: string): Promise<JoinWorkspaceOutcome> {
  const code = normalizeFamilyCode(rawCode);
  if (!code) {
    throw new WorkspaceJoinError('INVALID_CODE', 'Enter a valid household code like Q3HF-DARK');
  }

  const userId = await resolveAppUserId();
  if (!userId) {
    throw new WorkspaceJoinError('NOT_SIGNED_IN', 'Sign in to join a household workspace.');
  }

  if (!supabase) {
    const localId = `local_ws_${code.replace('-', '')}`;
    const now = new Date().toISOString();
    await setStoredCurrentWorkspaceId(localId);
    const workspace: Workspace = {
      id: localId,
      name: 'Joined Household',
      ownerUserId: 'unknown',
      inviteCode: code,
      stripeSubscriptionId: null,
      subscriptionStatus: 'inactive',
      subscriptionPlan: null,
      currentPeriodEnd: null,
      createdAt: now,
      updatedAt: now,
    };
    return { workspace, alreadyMember: false, subscriptionActive: false };
  }

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('invite_code', code)
    .maybeSingle();

  if (error) throw new WorkspaceJoinError('GENERIC', error.message);
  if (!data) {
    throw new WorkspaceJoinError(
      'NOT_FOUND',
      'No household found with that code. Ask the owner to share their invite code.'
    );
  }

  const workspace = mapWorkspace(data as WorkspaceRow);

  if (workspace.ownerUserId === userId) {
    throw new WorkspaceJoinError(
      'ALREADY_OWNER',
      'This is your household code — share it with family members instead.'
    );
  }

  const alreadyMember = await isUserWorkspaceMember(workspace.id, userId);
  await registerWorkspaceMember(workspace.id, userId, 'member');
  await setStoredCurrentWorkspaceId(workspace.id);

  return {
    workspace,
    alreadyMember,
    subscriptionActive: workspaceHasActiveSubscription(workspace),
  };
}

export async function ensureCurrentWorkspace(): Promise<Workspace | null> {
  const userId = await resolveAppUserId();
  if (!userId) return null;

  const storedId = await getStoredCurrentWorkspaceId();
  if (storedId) {
    const existing = await getWorkspaceById(storedId);
    if (existing) return existing;
    if (storedId.startsWith('local_')) {
      return {
        id: storedId,
        name: 'My Household',
        ownerUserId: userId,
        inviteCode: storedId.replace('local_ws_', '').slice(0, 4) + '-' + storedId.replace('local_ws_', '').slice(4),
        stripeSubscriptionId: null,
        subscriptionStatus: 'inactive',
        subscriptionPlan: null,
        currentPeriodEnd: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  const workspaces = await listWorkspacesForUser(userId);
  if (workspaces.length > 0) {
    await setStoredCurrentWorkspaceId(workspaces[0]!.id);
    return workspaces[0]!;
  }

  return null;
}

export function buildWorkspaceInviteUrl(code: string): string {
  return getInviteUrl(code);
}
