import { canUseWorkspaceScope } from '@/src/services/dataScopeLogic';

export type ReceiptSaveScope = 'personal' | 'workspace';

export type WorkspaceReceiptSaveFailureReason =
  | 'wrong_scope'
  | 'not_signed_in'
  | 'no_workspace'
  | 'local_workspace'
  | 'no_supabase'
  | 'not_member'
  | 'no_subscription'
  | 'database_error';

export type WorkspaceReceiptSaveContext = {
  scope: ReceiptSaveScope;
  userId: string | null;
  workspaceId: string | null;
  hasSupabase: boolean;
  isMember: boolean;
  hasActiveSub: boolean;
};

/** Pure guard for household receipt saves — membership + subscription, not UI active scope. */
export function getWorkspaceReceiptSaveBlocker(
  ctx: WorkspaceReceiptSaveContext
): WorkspaceReceiptSaveFailureReason | null {
  if (ctx.scope !== 'workspace') return 'wrong_scope';
  if (!ctx.userId) return 'not_signed_in';
  if (!ctx.workspaceId) return 'no_workspace';
  if (ctx.workspaceId.startsWith('local_')) return 'local_workspace';
  if (!ctx.hasSupabase) return 'no_supabase';
  if (!canUseWorkspaceScope(ctx.isMember, ctx.hasActiveSub)) {
    return ctx.isMember ? 'no_subscription' : 'not_member';
  }
  return null;
}

export function workspaceReceiptSaveErrorMessage(
  reason: WorkspaceReceiptSaveFailureReason,
  detail?: string
): string {
  switch (reason) {
    case 'wrong_scope':
      return 'Household save is only available when saving to your family workspace.';
    case 'not_signed_in':
      return 'Sign in to save receipts to your household workspace.';
    case 'no_workspace':
      return 'No household workspace is selected. Create or join one from Family Plans.';
    case 'local_workspace':
      return 'This household exists only on this device. Configure Supabase cloud sync or save to Personal.';
    case 'no_supabase':
      return 'Household cloud sync is not configured. Save to Personal or set up Supabase.';
    case 'not_member':
      return 'You are not a member of this household workspace.';
    case 'no_subscription':
      return 'An active Household subscription is required to save shared receipts.';
    case 'database_error':
      return detail?.trim()
        ? `Could not save receipt to your household workspace: ${detail.trim()}`
        : 'Could not save receipt to your household workspace. Please try again.';
    default:
      return 'Could not save receipt to your household workspace.';
  }
}

export class WorkspaceReceiptSaveError extends Error {
  readonly reason: WorkspaceReceiptSaveFailureReason;
  readonly cause?: unknown;

  constructor(message: string, reason: WorkspaceReceiptSaveFailureReason, cause?: unknown) {
    super(message);
    this.name = 'WorkspaceReceiptSaveError';
    this.reason = reason;
    this.cause = cause;
  }
}
