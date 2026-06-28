import type { ParsedReceiptDraft } from '@/src/models/types';
import type { Receipt, ReceiptItem } from '@/src/models/types';
import { resolveAppUserId } from '@/src/services/authService';
import { canAccessWorkspaceFeature } from '@/src/services/featureGateService';
import { supabase } from '@/src/services/supabaseClient';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import { generateId } from '@/src/utils/id';

export type ReceiptSaveScope = 'personal' | 'workspace';

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
  scope: ReceiptSaveScope
): Promise<string | null> {
  if (scope !== 'workspace') return null;
  if (!canAccessWorkspaceFeature()) return null;

  const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
  const userId = await resolveAppUserId();
  if (!supabase || !workspaceId || !userId || workspaceId.startsWith('local_')) return null;

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
    created_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('workspace_receipts').upsert(payload, {
    onConflict: 'workspace_id,local_receipt_id',
    ignoreDuplicates: false,
  });

  if (error) {
    console.warn('[workspaceReceipt] save failed:', error.message);
    return null;
  }

  return receiptId;
}
