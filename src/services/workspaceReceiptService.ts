import type { ParsedReceiptDraft } from '@/src/models/types';
import type { Receipt } from '@/src/models/types';
import { resolveAppUserId } from '@/src/services/authService';
import { canAccessWorkspaceFeature } from '@/src/services/featureGateService';
import { supabase } from '@/src/services/supabaseClient';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

export type ReceiptSaveScope = 'personal' | 'workspace';

export async function saveReceiptToWorkspace(
  receipt: Receipt | (ParsedReceiptDraft & { id: string; imageUri?: string }),
  scope: ReceiptSaveScope
): Promise<void> {
  if (scope !== 'workspace') return;
  if (!canAccessWorkspaceFeature()) return;

  const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
  const userId = await resolveAppUserId();
  if (!supabase || !workspaceId || !userId || workspaceId.startsWith('local_')) return;

  const payload = {
    workspace_id: workspaceId,
    local_receipt_id: 'id' in receipt ? receipt.id : null,
    store_name: receipt.storeName,
    receipt_date: receipt.date,
    total: receipt.total,
    data: {
      subtotal: receipt.subtotal,
      tax: receipt.tax,
      items: receipt.items ?? [],
      storeAddress: receipt.storeAddress,
      storeCity: receipt.storeCity,
      storeRegion: receipt.storeRegion,
      storePostalCode: receipt.storePostalCode,
      storeCountry: receipt.storeCountry,
    },
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('workspace_receipts').upsert(payload, {
    onConflict: 'workspace_id,local_receipt_id',
    ignoreDuplicates: false,
  });

  if (error) {
    console.warn('[workspaceReceipt] save failed:', error.message);
  }
}
