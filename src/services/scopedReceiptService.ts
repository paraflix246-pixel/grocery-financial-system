import type { Receipt } from '@/src/models/types';
import type { DataScope } from '@/src/models/workspace';
import { isPersonalScope } from '@/src/services/dataScopeLogic';
import { getPersonalReceiptOwnerId } from '@/src/services/personalReceiptScope';
import { scopedReceiptStorageCacheKey } from '@/src/services/personalReceiptScopeLogic';
import { resolveScopedReceiptSource } from '@/src/services/scopedReceiptLoadLogic';
import { getReceipts } from '@/src/services/storageService';
import { listWorkspaceReceipts } from '@/src/services/workspaceReceiptService';
import { createStaleWhileRevalidateCache } from '@/src/utils/staleWhileRevalidateCache';

const RECEIPTS_STALE_MS = 30_000;
const receiptCache = createStaleWhileRevalidateCache<Receipt[]>(RECEIPTS_STALE_MS);

async function fetchReceiptsForScope(
  scope: DataScope,
  workspaceId: string | null
): Promise<Receipt[]> {
  switch (resolveScopedReceiptSource(scope, workspaceId)) {
    case 'workspace_remote':
      return listWorkspaceReceipts(workspaceId!);
    case 'personal_storage':
      return getReceipts();
    default:
      return [];
  }
}

/** Load receipts for the active data context — personal SQLite or household Supabase. */
export async function loadReceiptsForScope(
  scope: DataScope,
  workspaceId: string | null,
  options?: { forceRefresh?: boolean }
): Promise<Receipt[]> {
  const userId = isPersonalScope(scope) ? await getPersonalReceiptOwnerId() : null;
  const key = scopedReceiptStorageCacheKey(scope, workspaceId, userId);

  if (!options?.forceRefresh) {
    const cached = receiptCache.get(key);
    if (cached) {
      if (cached.isStale) {
        void fetchReceiptsForScope(scope, workspaceId).then((receipts) => {
          receiptCache.set(key, receipts);
        });
      }
      return cached.value;
    }
  }

  const receipts = await fetchReceiptsForScope(scope, workspaceId);
  receiptCache.set(key, receipts);
  return receipts;
}

export function invalidateScopedReceiptsCache(scope?: DataScope, workspaceId?: string | null): void {
  if (scope === undefined) {
    receiptCache.clear();
    return;
  }
  if (isPersonalScope(scope)) {
    receiptCache.clear();
    return;
  }
  receiptCache.delete(scopedReceiptStorageCacheKey(scope, workspaceId ?? null, null));
}

/** Clear all cached receipt lists after account switch or sign-out. */
export function invalidateAllScopedReceiptsCache(): void {
  receiptCache.clear();
}
