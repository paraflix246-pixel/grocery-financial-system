import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RealtimeChannel } from '@supabase/supabase-js';

import {
  buildFamilyInviteUrl,
  FAMILY_CODE_KEY,
  getFamilyGroupId,
  getOrCreateFamilyCode,
  getOrCreateMemberId,
  normalizeFamilyCode,
  setFamilyGroupId,
} from '@/src/services/familyCodeService';
import { importFamilyListSnapshot, syncFamilyListSnapshot } from '@/src/services/familyImportService';
import type { FamilyListSnapshot } from '@/src/services/familyListSnapshot';
import { notifyFamilyListUpdated, notifyHouseholdReceiptSaved } from '@/src/services/notificationService';
import { resolveAppUserId } from '@/src/services/authService';
import { getListById, getListItems } from '@/src/services/storageService';
import { supabase } from '@/src/services/supabaseClient';
import { canAccessWorkspaceFeature } from '@/src/services/featureGateService';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';
import {
  ensureCurrentWorkspace,
  joinWorkspaceByCode,
  createWorkspace,
} from '@/src/services/workspaceService';
import { useListStore } from '@/src/store/useListStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';

const SYNC_QUEUE_KEY = '@smartcart_family_sync_queue';
const LAST_EXPORT_KEY = '@smartcart_family_last_export';
const SHARED_LIST_MAP_KEY = '@smartcart_family_shared_map';

export type FamilySyncQueueEntry = {
  id: string;
  snapshot: FamilyListSnapshot;
  listId?: string;
  queuedAt: string;
};

type SharedListRow = {
  id: string;
  group_id: string;
  workspace_id?: string | null;
  local_list_id: string | null;
  name: string;
  items: FamilyListSnapshot['items'];
  updated_at: string;
  updated_by: string | null;
  updated_by_name: string | null;
};

type SharedListMap = Record<string, string>;

const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
let realtimeChannel: RealtimeChannel | null = null;
let receiptRealtimeChannel: RealtimeChannel | null = null;
let realtimeGroupId: string | null = null;

async function readQueue(): Promise<FamilySyncQueueEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FamilySyncQueueEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(entries: FamilySyncQueueEntry[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(entries));
}

async function readSharedListMap(): Promise<SharedListMap> {
  try {
    const raw = await AsyncStorage.getItem(SHARED_LIST_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SharedListMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeSharedListMap(map: SharedListMap): Promise<void> {
  await AsyncStorage.setItem(SHARED_LIST_MAP_KEY, JSON.stringify(map));
}

async function getSharedListIdForLocal(localListId: string): Promise<string | null> {
  const map = await readSharedListMap();
  return map[localListId] ?? null;
}

async function setSharedListIdForLocal(localListId: string, sharedListId: string): Promise<void> {
  const map = await readSharedListMap();
  map[localListId] = sharedListId;
  await writeSharedListMap(map);
}

async function getLocalListIdForShared(sharedListId: string): Promise<string | null> {
  const map = await readSharedListMap();
  for (const [localId, sharedId] of Object.entries(map)) {
    if (sharedId === sharedListId) return localId;
  }
  return null;
}

export function isFamilySyncAvailable(): boolean {
  return supabase !== null;
}

function workspaceSyncUnlocked(): boolean {
  return canAccessWorkspaceFeature();
}

async function getActiveWorkspaceId(): Promise<string | null> {
  const fromStore = useWorkspaceStore.getState().currentWorkspaceId;
  if (fromStore) return fromStore;
  const workspace = await ensureCurrentWorkspace();
  return workspace?.id ?? null;
}

function memberDisplayName(): string {
  const name = useSettingsStore.getState().settings?.displayName?.trim();
  return name || 'A family member';
}

export async function getFamilySyncQueue(): Promise<FamilySyncQueueEntry[]> {
  return readQueue();
}

export async function getLastFamilyExportTimestamp(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_EXPORT_KEY);
}

export async function buildListSnapshot(listId: string, familyCode?: string): Promise<FamilyListSnapshot | null> {
  const list = await getListById(listId);
  if (!list) return null;
  const items = await getListItems(listId);
  const code = familyCode ?? (await getOrCreateFamilyCode());
  return {
    version: 1,
    listName: list.name,
    familyCode: code,
    exportedAt: new Date().toISOString(),
    items: items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      expectedPrice: i.expectedPrice,
      category: i.category,
    })),
  };
}

export async function ensureFamilyGroup(): Promise<{ groupId: string; code: string }> {
  const workspace = await ensureCurrentWorkspace();
  if (workspace) {
    return { groupId: workspace.id, code: workspace.inviteCode };
  }

  const created = await createWorkspace();
  await useWorkspaceStore.getState().loadWorkspaces();
  return { groupId: created.id, code: created.inviteCode };
}

export type JoinFamilyGroupOutcome = {
  groupId: string;
  code: string;
  workspaceName: string;
  alreadyMember: boolean;
  subscriptionActive: boolean;
};

export async function joinFamilyGroupByCode(rawCode: string): Promise<JoinFamilyGroupOutcome> {
  const outcome = await joinWorkspaceByCode(rawCode);
  await setFamilyGroupId(outcome.workspace.id);
  await AsyncStorage.setItem(FAMILY_CODE_KEY, outcome.workspace.inviteCode);
  await useWorkspaceStore.getState().loadWorkspaces();
  return {
    groupId: outcome.workspace.id,
    code: outcome.workspace.inviteCode,
    workspaceName: outcome.workspace.name,
    alreadyMember: outcome.alreadyMember,
    subscriptionActive: outcome.subscriptionActive,
  };
}

export async function enqueueFamilySync(snapshot: FamilyListSnapshot, listId?: string): Promise<void> {
  const queue = await readQueue();
  queue.push({
    id: `${Date.now()}`,
    snapshot,
    listId,
    queuedAt: new Date().toISOString(),
  });
  await writeQueue(queue);
  await AsyncStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
}

async function pushSnapshotToSupabase(
  groupId: string,
  listId: string,
  snapshot: FamilyListSnapshot
): Promise<string | null> {
  if (!supabase || groupId.startsWith('local_')) return null;

  const memberId = await getOrCreateMemberId();
  const updatedByName = memberDisplayName();
  const existingSharedId = await getSharedListIdForLocal(listId);
  const workspaceId = (await getActiveWorkspaceId()) ?? groupId;
  const payload = {
    group_id: workspaceId,
    workspace_id: workspaceId,
    local_list_id: listId,
    name: snapshot.listName?.trim() || 'Shared List',
    items: snapshot.items,
    updated_at: new Date().toISOString(),
    updated_by: memberId,
    updated_by_name: updatedByName,
  };

  if (existingSharedId) {
    const { error } = await supabase.from('shared_lists').update(payload).eq('id', existingSharedId);
    if (error) throw new Error(error.message);
    return existingSharedId;
  }

  const { data, error } = await supabase.from('shared_lists').insert(payload).select('id').single();
  if (error || !data) throw new Error(error?.message ?? 'Could not share list');
  await setSharedListIdForLocal(listId, data.id);
  return data.id;
}

export async function shareListToFamily(listId: string): Promise<{
  snapshot: FamilyListSnapshot;
  inviteUrl: string;
  synced: boolean;
}> {
  const { groupId, code } = await ensureFamilyGroup();
  const snapshot = await buildListSnapshot(listId, code);
  if (!snapshot) throw new Error('List not found');

  let synced = false;
  if (isFamilySyncAvailable() && workspaceSyncUnlocked()) {
    try {
      await pushSnapshotToSupabase(groupId, listId, snapshot);
      synced = true;
      await AsyncStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
    } catch (error) {
      console.warn('[familySync] push failed, queueing:', error);
      await enqueueFamilySync(snapshot, listId);
    }
  } else {
    await enqueueFamilySync(snapshot, listId);
  }

  return {
    snapshot,
    inviteUrl: buildFamilyInviteUrl(code),
    synced,
  };
}

export async function flushFamilySyncQueue(): Promise<number> {
  const queue = await readQueue();
  if (queue.length === 0) return 0;

  if (!supabase || !workspaceSyncUnlocked()) {
    return 0;
  }

  const { groupId } = await ensureFamilyGroup();
  let flushed = 0;
  const remaining: FamilySyncQueueEntry[] = [];

  for (const entry of queue) {
    try {
      if (entry.listId) {
        await pushSnapshotToSupabase(groupId, entry.listId, entry.snapshot);
      } else {
        await pushSnapshotToSupabase(groupId, `queued_${entry.id}`, entry.snapshot);
      }
      flushed += 1;
    } catch {
      remaining.push(entry);
    }
  }

  await writeQueue(remaining);
  if (flushed > 0) {
    await AsyncStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
  }
  return flushed;
}

export function scheduleFamilyListPush(listId: string, debounceMs = 2000): void {
  if (!workspaceSyncUnlocked() || !isFamilySyncAvailable()) return;

  const existing = pushTimers.get(listId);
  if (existing) clearTimeout(existing);

  pushTimers.set(
    listId,
    setTimeout(() => {
      pushTimers.delete(listId);
      void (async () => {
        try {
          const snapshot = await buildListSnapshot(listId);
          if (!snapshot) return;
          const groupId = await getFamilyGroupId();
          if (!groupId) return;
          await pushSnapshotToSupabase(groupId, listId, snapshot);
          await AsyncStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString());
        } catch (error) {
          console.warn('[familySync] debounced push failed:', error);
        }
      })();
    }, debounceMs)
  );
}

async function applyRemoteSharedList(row: SharedListRow): Promise<void> {
  const memberId = await getOrCreateMemberId();
  if (row.updated_by && row.updated_by === memberId) return;

  const snapshot: FamilyListSnapshot = {
    version: 1,
    listName: row.name,
    exportedAt: row.updated_at,
    items: Array.isArray(row.items) ? row.items : [],
  };

  let localListId = await getLocalListIdForShared(row.id);
  if (!localListId && row.local_list_id) {
    const mapped = await getSharedListIdForLocal(row.local_list_id);
    if (mapped === row.id) {
      localListId = row.local_list_id;
    }
  }

  if (localListId) {
    const existing = await getListById(localListId);
    if (existing) {
      await syncFamilyListSnapshot(localListId, snapshot);
      await useListStore.getState().refreshItems(localListId);
      await notifyFamilyListUpdated(row.updated_by_name ?? 'A family member', row.name);
      return;
    }
  }

  const result = await importFamilyListSnapshot(snapshot, { createNew: true });
  await setSharedListIdForLocal(result.listId, row.id);
  await useListStore.getState().loadLists();
  await useListStore.getState().loadListItems(result.listId);
  await notifyFamilyListUpdated(row.updated_by_name ?? 'A family member', row.name);
}

async function applyRemoteWorkspaceReceipt(row: {
  created_by?: string | null;
  store_name?: string | null;
}): Promise<void> {
  const userId = await resolveAppUserId();
  if (row.created_by && userId && row.created_by === userId) return;
  const storeName = row.store_name?.trim() || 'a store';
  await notifyHouseholdReceiptSaved(storeName);
}

export async function pullFamilyListsOnce(): Promise<number> {
  if (!supabase || !workspaceSyncUnlocked()) return 0;
  const groupId = await getFamilyGroupId();
  if (!groupId || groupId.startsWith('local_')) return 0;

  const workspaceId = await getActiveWorkspaceId();
  const filterId = workspaceId ?? groupId;
  const filterColumn = workspaceId ? 'workspace_id' : 'group_id';

  const { data, error } = await supabase
    .from('shared_lists')
    .select('*')
    .eq(filterColumn, filterId)
    .order('updated_at', { ascending: false });
  if (error || !data) return 0;

  for (const row of data as SharedListRow[]) {
    await applyRemoteSharedList(row);
  }
  return data.length;
}

export async function startFamilyRealtimeSync(): Promise<void> {
  if (!supabase || !workspaceSyncUnlocked()) return;

  const groupId = await getFamilyGroupId();
  if (!groupId || groupId.startsWith('local_')) {
    try {
      await ensureFamilyGroup();
    } catch {
      return;
    }
  }

  const activeGroupId = await getFamilyGroupId();
  if (!activeGroupId || activeGroupId.startsWith('local_')) return;

  if (realtimeChannel && realtimeGroupId === activeGroupId) return;

  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeGroupId = activeGroupId;
  const workspaceId = await getActiveWorkspaceId();
  const filterColumn = workspaceId ? 'workspace_id' : 'group_id';
  const filterId = workspaceId ?? activeGroupId;

  realtimeChannel = supabase
    .channel(`family-lists:${filterId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shared_lists',
        filter: `${filterColumn}=eq.${filterId}`,
      },
      (payload) => {
        const row = (payload.new ?? payload.old) as SharedListRow | null;
        if (!row || !row.id) return;
        void applyRemoteSharedList(row).catch((error) => {
          console.warn('[familySync] remote apply failed:', error);
        });
      }
    )
    .subscribe();

  if (workspaceId) {
    if (receiptRealtimeChannel) {
      await supabase.removeChannel(receiptRealtimeChannel);
      receiptRealtimeChannel = null;
    }
    receiptRealtimeChannel = supabase
      .channel(`workspace-receipts:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workspace_receipts',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const row = payload.new as { created_by?: string | null; store_name?: string | null };
          void applyRemoteWorkspaceReceipt(row).catch((error) => {
            console.warn('[familySync] workspace receipt notify failed:', error);
          });
        }
      )
      .subscribe();
  }

  void pullFamilyListsOnce().catch(() => {});
}

export async function stopFamilyRealtimeSync(): Promise<void> {
  if (!supabase) return;
  if (realtimeChannel) {
    await supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  if (receiptRealtimeChannel) {
    await supabase.removeChannel(receiptRealtimeChannel);
    receiptRealtimeChannel = null;
  }
  realtimeGroupId = null;
}

export async function pullFamilySnapshotFromUrl(url: string): Promise<FamilyListSnapshot | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const json = (await response.json()) as FamilyListSnapshot;
    if (!json.items || !Array.isArray(json.items)) return null;
    return json;
  } catch {
    return null;
  }
}

export async function mergeRemoteFamilySnapshot(
  snapshot: FamilyListSnapshot,
  options: { mergeIntoListId?: string; createNew?: boolean } = {}
) {
  return importFamilyListSnapshot(snapshot, options);
}

export { buildFamilyInviteUrl };
