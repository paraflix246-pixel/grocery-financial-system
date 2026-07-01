import type { DataScope, Workspace, WorkspaceMember } from '@/src/models/workspace';

export type ProScopeContext = {
  activeScope: DataScope;
  /** Owner of the current household workspace. */
  isWorkspaceOwner: boolean;
  isCurrentMember: boolean;
  hasActiveWorkspaceSub: boolean;
  /** Personal Pro subscription or trial (not family workspace). */
  hasPersonalPro: boolean;
};

/** True when userId is the owner of the given workspace. */
export function isWorkspaceOwner(
  userId: string | null | undefined,
  workspace: Workspace | null | undefined,
  members: WorkspaceMember[] = []
): boolean {
  if (!userId || !workspace) return false;
  if (workspace.ownerUserId === userId) return true;
  return members.some((m) => m.userId === userId && m.role === 'owner');
}

/**
 * Scope-aware Pro access for appearance and personal-gated features.
 *
 * - Household leader: Pro everywhere (personal sub and/or active family sub).
 * - Household member: Pro only in workspace scope when family sub is active.
 * - Non-members: personal Pro subscription only.
 */
export function hasProInCurrentScope(ctx: ProScopeContext): boolean {
  if (ctx.hasPersonalPro && !ctx.isCurrentMember) {
    return true;
  }

  if (ctx.isWorkspaceOwner && ctx.hasPersonalPro) {
    return true;
  }

  if (ctx.isWorkspaceOwner && ctx.hasActiveWorkspaceSub) {
    return true;
  }

  if (
    ctx.activeScope === 'workspace' &&
    ctx.isCurrentMember &&
    ctx.hasActiveWorkspaceSub
  ) {
    return true;
  }

  return false;
}

/**
 * Family/workspace-only features (sync, family plans UI).
 * Leaders may access from any scope; members only while viewing workspace data.
 */
export function hasWorkspaceFeatureInCurrentScope(ctx: ProScopeContext): boolean {
  if (!ctx.isCurrentMember || !ctx.hasActiveWorkspaceSub) {
    return false;
  }
  if (ctx.isWorkspaceOwner) {
    return true;
  }
  return ctx.activeScope === 'workspace';
}
