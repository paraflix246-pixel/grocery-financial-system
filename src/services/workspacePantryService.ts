import type { PantryItem } from '@/src/models/types';
import { toPantryItemView, type PantryItemView } from '@/src/services/pantryService';
import { resolveAppUserId } from '@/src/services/authService';
import { canAccessWorkspaceFeature } from '@/src/services/featureGateService';
import { supabase } from '@/src/services/supabaseClient';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import { generateId } from '@/src/utils/id';

type WorkspacePantryRow = {
  id: string;
  workspace_id: string;
  name: string;
  category: string;
  amount: number;
  unit: string;
  added_date: string;
  shelf_life_days: number;
  low_stock_threshold: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: WorkspacePantryRow): PantryItemView {
  const item: PantryItem = {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity: row.amount,
    unit: row.unit,
    addedDate: row.added_date,
    shelfLifeDays: row.shelf_life_days,
    lowStockThreshold: row.low_stock_threshold,
    source: 'manual',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return toPantryItemView(item);
}

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('could not find the table') || (msg.includes('relation') && msg.includes('does not exist'));
}

export async function listWorkspacePantryItems(workspaceId: string): Promise<PantryItemView[]> {
  if (!supabase || workspaceId.startsWith('local_')) return [];

  const { data, error } = await supabase
    .from('workspace_pantry_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return [];
    console.warn('[workspacePantry] list failed:', error.message);
    return [];
  }

  return (data as WorkspacePantryRow[]).map(mapRow);
}

export async function addWorkspacePantryItem(input: {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  addedDate: string;
  shelfLifeDays: number;
  lowStockThreshold: number;
}): Promise<PantryItemView | null> {
  if (!canAccessWorkspaceFeature()) return null;

  const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
  const userId = await resolveAppUserId();
  if (!supabase || !workspaceId || !userId || workspaceId.startsWith('local_')) return null;

  const { data, error } = await supabase
    .from('workspace_pantry_items')
    .insert({
      id: generateId(),
      workspace_id: workspaceId,
      name: input.name,
      category: input.category,
      amount: input.quantity,
      unit: input.unit,
      added_date: input.addedDate,
      shelf_life_days: input.shelfLifeDays,
      low_stock_threshold: input.lowStockThreshold,
      created_by: userId,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error)) return null;
    console.warn('[workspacePantry] add failed:', error.message);
    return null;
  }

  return mapRow(data as WorkspacePantryRow);
}

export async function removeWorkspacePantryItem(itemId: string): Promise<void> {
  if (!canAccessWorkspaceFeature()) return;

  const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
  if (!supabase || !workspaceId || workspaceId.startsWith('local_')) return;

  const { error } = await supabase
    .from('workspace_pantry_items')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', itemId);

  if (error && !isMissingTableError(error)) {
    console.warn('[workspacePantry] remove failed:', error.message);
  }
}

export async function updateWorkspacePantryAmount(itemId: string, amount: number): Promise<void> {
  if (!canAccessWorkspaceFeature()) return;

  const workspaceId = useWorkspaceStore.getState().currentWorkspaceId;
  if (!supabase || !workspaceId || workspaceId.startsWith('local_')) return;

  const { error } = await supabase
    .from('workspace_pantry_items')
    .update({ amount, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('id', itemId);

  if (error && !isMissingTableError(error)) {
    console.warn('[workspacePantry] update failed:', error.message);
  }
}
