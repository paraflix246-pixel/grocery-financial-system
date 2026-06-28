import type { DataScope } from '@/src/models/workspace';

/** Personal SQLite data — never mixed with household workspace rows. */
export function isPersonalScope(scope: DataScope): boolean {
  return scope === 'personal';
}

/** Household workspace data — scoped by workspace_id in Supabase. */
export function isWorkspaceScope(scope: DataScope): boolean {
  return scope === 'workspace';
}

export function resolveActiveScope(
  storedScope: DataScope,
  hasWorkspaceAccess: boolean
): DataScope {
  if (storedScope === 'workspace' && hasWorkspaceAccess) return 'workspace';
  return 'personal';
}

export function canUseWorkspaceScope(
  isMember: boolean,
  hasActiveWorkspaceSub: boolean,
  isAdmin = false
): boolean {
  if (isAdmin) return isMember;
  return isMember && hasActiveWorkspaceSub;
}

/** Receipts saved only to the household must not be written to personal storage. */
export function shouldSaveReceiptToPersonal(scope: DataScope): boolean {
  return isPersonalScope(scope);
}

export function shouldSaveReceiptToWorkspace(scope: DataScope): boolean {
  return isWorkspaceScope(scope);
}

/** Community price records and personal analytics stay on personal receipts only. */
export function shouldSyncPersonalSideEffects(scope: DataScope): boolean {
  return isPersonalScope(scope);
}
