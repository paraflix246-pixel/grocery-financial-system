import type { Receipt } from '@/src/models/types';
import type { DataScope } from '@/src/models/workspace';
import { isPersonalScope } from '@/src/services/dataScopeLogic';

export const LEGACY_RECEIPT_OWNER_KEY = '@grocery_financial_legacy_receipt_owner_v1';

export type LegacyReceiptClaimDecision =
  | { action: 'assign'; ownerId: string }
  | { action: 'skip'; reason: 'not_legacy_owner' }
  | { action: 'none' };

/** Decide whether unowned legacy receipts should attach to the active user. */
export function resolveLegacyReceiptClaim(
  currentUserId: string,
  legacyOwnerId: string | null,
  unownedCount: number
): LegacyReceiptClaimDecision {
  if (unownedCount <= 0) return { action: 'none' };
  if (!legacyOwnerId) return { action: 'assign', ownerId: currentUserId };
  if (legacyOwnerId === currentUserId) return { action: 'assign', ownerId: currentUserId };
  return { action: 'skip', reason: 'not_legacy_owner' };
}

export function receiptBelongsToOwner(
  receiptOwnerId: string | null | undefined,
  currentOwnerId: string
): boolean {
  return receiptOwnerId === currentOwnerId;
}

export function filterPersonalReceipts(receipts: Receipt[], ownerId: string): Receipt[] {
  return receipts.filter((receipt) => receiptBelongsToOwner(receipt.ownerUserId, ownerId));
}

export function scopedReceiptStorageCacheKey(
  scope: DataScope,
  workspaceId: string | null,
  userId: string | null
): string {
  if (isPersonalScope(scope)) {
    return `personal:${userId ?? 'anonymous'}`;
  }
  return `workspace:${workspaceId ?? 'none'}`;
}
