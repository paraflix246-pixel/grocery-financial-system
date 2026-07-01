import type { DataScope } from '@/src/models/workspace';
import { isPersonalScope, isWorkspaceScope } from '@/src/services/dataScopeLogic';

export type ScopedReceiptSource = 'personal_storage' | 'workspace_remote' | 'none';

/** Which backend supplies receipts for the active data scope. */
export function resolveScopedReceiptSource(
  scope: DataScope,
  workspaceId: string | null
): ScopedReceiptSource {
  if (isWorkspaceScope(scope) && workspaceId) return 'workspace_remote';
  if (isPersonalScope(scope)) return 'personal_storage';
  return 'none';
}
