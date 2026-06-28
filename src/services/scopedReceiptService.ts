import type { Receipt } from '@/src/models/types';
import type { DataScope } from '@/src/models/workspace';
import { isPersonalScope, isWorkspaceScope } from '@/src/services/dataScopeLogic';
import { getReceipts } from '@/src/services/storageService';
import { listWorkspaceReceipts } from '@/src/services/workspaceReceiptService';
import { createStaleWhileRevalidateCache } from '@/src/utils/staleWhileRevalidateCache';

const RECEIPTS_STALE_MS = 30_000;
const receiptCache = createStaleWhileRevalidateCache<Receipt[]>(RECEIPTS_STALE_MS);

function scopeCacheKey(scope: DataScope, workspaceId: string | null): string {
  return `${scope}:${workspaceId ?? 'none'}`;
}

async function fetchReceiptsForScope(
  scope: DataScope,
  workspaceId: string | null
): Promise<Receipt[]> {
  if (isWorkspaceScope(scope) && workspaceId) {
    return listWorkspaceReceipts(workspaceId);
  }
  if (isPersonalScope(scope)) {
    return getReceipts();
  }
  return [];
}

/** Load receipts for the active data context — personal SQLite or household Supabase. */
export async function loadReceiptsForScope(
  scope: DataScope,
  workspaceId: string | null,
  options?: { forceRefresh?: boolean }
): Promise<Receipt[]> {
  const key = scopeCacheKey(scope, workspaceId);

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
  receiptCache.delete(scopeCacheKey(scope, workspaceId ?? null));
}
