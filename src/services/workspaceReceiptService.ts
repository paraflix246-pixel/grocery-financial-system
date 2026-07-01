import type { ParsedReceiptDraft } from '@/src/models/types';
import type { Receipt, ReceiptItem } from '@/src/models/types';
import { resolveAppUserId } from '@/src/services/authService';
import { supabase } from '@/src/services/supabaseClient';
import {
  getWorkspaceReceiptSaveBlocker,
  WorkspaceReceiptSaveError,
  workspaceReceiptSaveErrorMessage,
} from '@/src/services/workspaceReceiptSaveLogic';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import { generateId } from '@/src/utils/id';

export type { ReceiptSaveScope, WorkspaceReceiptSaveFailureReason } from '@/src/services/workspaceReceiptSaveLogic';
export { WorkspaceReceiptSaveError } from '@/src/services/workspaceReceiptSaveLogic';

type WorkspaceReceiptRow = {
  id: string;
  workspace_id: string;
  local_receipt_id: string | null;
  store_name: string;
  receipt_date: string;
  total: number;
  data: {
    subtotal?: number;
    tax?: number;
    items?: Array<{
      id?: string;
      name: string;
      price: number;
      quantity: number;
      unitPrice?: number;
      unit?: string;
      lineKind?: ReceiptItem['lineKind'];
    }>;
    storeAddress?: string;
    storeCity?: string;
    storeRegion?: string;
    storePostalCode?: string;
    storeCountry?: string;
    imageUri?: string;
  };
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapRowToReceipt(row: WorkspaceReceiptRow): Receipt {
  const receiptId = row.local_receipt_id ?? row.id;
  const data = row.data ?? {};
  const items: ReceiptItem[] = (data.items ?? []).map((item, index) => ({
    id: item.id ?? `${receiptId}_item_${index}`,
    receiptId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    unit: item.unit,
    lineKind: item.lineKind,
  }));

  return {
    id: receiptId,
    storeName: row.store_name,
    date: row.receipt_date,
    subtotal: data.subtotal,
    tax: data.tax,
    total: row.total,
    imageUri: data.imageUri ?? '',
    userCorrected: true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    storeAddress: data.storeAddress,
    storeCity: data.storeCity,
    storeRegion: data.storeRegion,
    storePostalCode: data.storePostalCode,
    storeCountry: data.storeCountry,
    items,
  };
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('could not find the table') || (msg.includes('relation') && msg.includes('does not exist'));
}

async function persistWorkspaceReceipt(
  payload: {
    workspace_id: string;
    local_receipt_id: string;
    store_name: string;
    receipt_date: string;
    total: number;
    data: WorkspaceReceiptRow['data'];
    created_by: string;
    updated_at: string;
  },
  workspaceId: string,
  receiptId: string
): Promise<void> {
  if (!supabase) {
    throw new WorkspaceReceiptSaveError(
      workspaceReceiptSaveErrorMessage('no_supabase'),
      'no_supabase'
    );
  }

  const { error: insertError } = await supabase.from('workspace_receipts').insert(payload);

  if (!insertError) return;

  if (insertError.code === '23505') {
    const { error: updateError } = await supabase
      .from('workspace_receipts')
      .update({
        store_name: payload.store_name,
        receipt_date: payload.receipt_date,
        total: payload.total,
        data: payload.data,
        updated_at: payload.updated_at,
      })
      .eq('workspace_id', workspaceId)
      .eq('local_receipt_id', receiptId);

    if (!updateError) return;

    if (isMissingTableError(updateError)) {
      throw new WorkspaceReceiptSaveError(
        'Workspace tables are not set up. Run supabase/migrations/006_workspaces.sql.',
        'database_error',
        updateError
      );
    }

    throw new WorkspaceReceiptSaveError(
      workspaceReceiptSaveErrorMessage('database_error', updateError.message),
      'database_error',
      updateError
    );
  }

  if (isMissingTableError(insertError)) {
    throw new WorkspaceReceiptSaveError(
      'Workspace tables are not set up. Run supabase/migrations/006_workspaces.sql.',
      'database_error',
      insertError
    );
  }

  throw new WorkspaceReceiptSaveError(
    workspaceReceiptSaveErrorMessage('database_error', insertError.message),
    'database_error',
    insertError
  );
}

export async function listWorkspaceReceipts(workspaceId: string): Promise<Receipt[]> {
  if (!supabase || workspaceId.startsWith('local_')) return [];

  const { data, error } = await supabase
    .from('workspace_receipts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('receipt_date', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    console.warn('[workspaceReceipt] list failed:', error.message);
    return [];
  }

  return (data as WorkspaceReceiptRow[]).map(mapRowToReceipt);
}

export async function getWorkspaceReceiptById(
  workspaceId: string,
  receiptId: string
): Promise<Receipt | null> {
  if (!supabase || workspaceId.startsWith('local_')) return null;

  const { data, error } = await supabase
    .from('workspace_receipts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .or(`local_receipt_id.eq.${receiptId},id.eq.${receiptId}`)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return null;
    console.warn('[workspaceReceipt] get failed:', error.message);
    return null;
  }

  return data ? mapRowToReceipt(data as WorkspaceReceiptRow) : null;
}

export async function saveReceiptToWorkspace(
  receipt: Receipt | (ParsedReceiptDraft & { id: string; imageUri?: string }),
  scope: import('@/src/services/workspaceReceiptSaveLogic').ReceiptSaveScope
): Promise<string> {
  const store = useWorkspaceStore.getState();
  const userId = await resolveAppUserId();
  const blocker = getWorkspaceReceiptSaveBlocker({
    scope,
    userId,
    workspaceId: store.currentWorkspaceId,
    hasSupabase: Boolean(supabase),
    isMember: store.isCurrentMember,
    hasActiveSub: store.hasActiveWorkspaceSub,
  });

  if (blocker) {
    throw new WorkspaceReceiptSaveError(workspaceReceiptSaveErrorMessage(blocker), blocker);
  }

  const workspaceId = store.currentWorkspaceId!;
  const receiptId = 'id' in receipt ? receipt.id : generateId();
  const payload = {
    workspace_id: workspaceId,
    local_receipt_id: receiptId,
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
      imageUri: receipt.imageUri,
    },
    created_by: userId!,
    updated_at: new Date().toISOString(),
  };

  await persistWorkspaceReceipt(payload, workspaceId, receiptId);
  const { invalidateScopedReceiptsCache } = await import('@/src/services/scopedReceiptService');
  invalidateScopedReceiptsCache('workspace', workspaceId);
  return receiptId;
}
