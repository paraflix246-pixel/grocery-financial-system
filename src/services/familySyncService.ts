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
import { notifyFamilyListUpdated } from '@/src/services/notificationService';
import { getListById, getListItems } from '@/src/services/storageService';
import { supabase } from '@/src/services/supabaseClient';
import { canAccessFeature } from '@/src/services/featureGateService';
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

function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const msg = (error.message ?? '').toLowerCase();
  return msg.includes('could not find the table') || (msg.includes('relation') && msg.includes('does not exist'));
}

async function fallbackLocalFamilyGroup(
  code: string,
  existingGroupId: string | null
): Promise<{ groupId: string; code: string }> {
  if (existingGroupId) return { groupId: existingGroupId, code };
  const localId = `local_${code}`;
  await setFamilyGroupId(localId);
  return { groupId: localId, code };
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
  const code = await getOrCreateFamilyCode();
  const existingGroupId = await getFamilyGroupId();
  if (!supabase) {
    return fallbackLocalFamilyGroup(code, existingGroupId);
  }

  try {
    if (existingGroupId && !existingGroupId.startsWith('local_')) {
      const { data, error } = await supabase
        .from('family_groups')
        .select('id, code')
        .eq('id', existingGroupId)
        .maybeSingle();
      if (error && isMissingTableError(error)) {
        console.warn('[familySync] family_groups table missing, using local group');
        return fallbackLocalFamilyGroup(code, existingGroupId);
      }
      if (data) return { groupId: data.id, code: data.code };
    }

    const { data: byCode, error: byCodeError } = await supabase
      .from('family_groups')
      .select('id, code')
      .eq('code', code)
      .maybeSingle();
    if (byCodeError && isMissingTableError(byCodeError)) {
      console.warn('[familySync] family_groups table missing, using local group');
      return fallbackLocalFamilyGroup(code, existingGroupId);
    }
    if (byCode) {
      await setFamilyGroupId(byCode.id);
      await registerFamilyMember(byCode.id);
      return { groupId: byCode.id, code: byCode.code };
    }

    const { data: created, error } = await supabase
      .from('family_groups')
      .insert({ code })
      .select('id, code')
      .single();
    if (error && isMissingTableError(error)) {
      console.warn('[familySync] family_groups table missing, using local group');
      return fallbackLocalFamilyGroup(code, existingGroupId);
    }
    if (error || !created) {
      throw new Error(error?.message ?? 'Could not create family group');
    }
    await setFamilyGroupId(created.id);
    await registerFamilyMember(created.id);
    return { groupId: created.id, code: created.code };
  } catch (error) {
    if (error instanceof Error && isMissingTableError({ message: error.message })) {
      console.warn('[familySync] family_groups unavailable, using local group');
      return fallbackLocalFamilyGroup(code, existingGroupId);
    }
    throw error;
  }
}

async function registerFamilyMember(groupId: string): Promise<void> {
  if (!supabase || groupId.startsWith('local_')) return;
  const memberId = await getOrCreateMemberId();
  const displayName = memberDisplayName();
  await supabase.from('family_members').upsert(
    { group_id: groupId, member_id: memberId, display_name: displayName },
    { onConflict: 'group_id,member_id' }
  );
}

export async function joinFamilyGroupByCode(rawCode: string): Promise<{ groupId: string; code: string }> {
  const code = normalizeFamilyCode(rawCode);
  if (!code) throw new Error('Enter a valid family code like Q3HF-DARK');

  if (!supabase) {
    const localId = `local_${code}`;
    await AsyncStorage.setItem('@smartcart_family_code', code);
    await setFamilyGroupId(localId);
    return { groupId: localId, code };
  }

  const { data: group, error } = await supabase.from('family_groups').select('id, code').eq('code', code).maybeSingle();
  if (error) throw new Error(error.message);
  if (!group) throw new Error('No family found with that code. Ask them to share their code from Family Plans.');

  await AsyncStorage.setItem(FAMILY_CODE_KEY, group.code);
  await setFamilyGroupId(group.id);
  await registerFamilyMember(group.id);
  return { groupId: group.id, code: group.code };
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
  const payload = {
    group_id: groupId,
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
  if (isFamilySyncAvailable() && canAccessFeature('multi_user_sync')) {
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

  if (!supabase || !canAccessFeature('multi_user_sync')) {
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
  if (!canAccessFeature('multi_user_sync') || !isFamilySyncAvailable()) return;

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

export async function pullFamilyListsOnce(): Promise<number> {
  if (!supabase || !canAccessFeature('multi_user_sync')) return 0;
  const groupId = await getFamilyGroupId();
  if (!groupId || groupId.startsWith('local_')) return 0;

  const { data, error } = await supabase
    .from('shared_lists')
    .select('*')
    .eq('group_id', groupId)
    .order('updated_at', { ascending: false });
  if (error || !data) return 0;

  for (const row of data as SharedListRow[]) {
    await applyRemoteSharedList(row);
  }
  return data.length;
}

export async function startFamilyRealtimeSync(): Promise<void> {
  if (!supabase || !canAccessFeature('multi_user_sync')) return;

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
  realtimeChannel = supabase
    .channel(`family-lists:${activeGroupId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shared_lists',
        filter: `group_id=eq.${activeGroupId}`,
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

  void pullFamilyListsOnce().catch(() => {});
}

export async function stopFamilyRealtimeSync(): Promise<void> {
  if (!supabase || !realtimeChannel) return;
  await supabase.removeChannel(realtimeChannel);
  realtimeChannel = null;
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
