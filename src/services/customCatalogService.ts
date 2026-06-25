/**
 * User-contributed grocery names — local-first, structured for future community catalog sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  buildCatalogEntry,
  type CustomCatalogEntry,
} from '@/src/services/customCatalogLogic';

export type { CustomCatalogEntry } from '@/src/services/customCatalogLogic';
export { matchesCustomEntry, normalizeCatalogKey, buildCatalogEntry } from '@/src/services/customCatalogLogic';

const LOCAL_KEY = '@smartcart_custom_catalog_v1';
const COMMUNITY_KEY = '@smartcart_community_catalog_v1';

export type CommunityCatalogEntry = CustomCatalogEntry & {
  contributions: number;
  lastContributedAt: string;
};

async function readLocal(): Promise<CustomCatalogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomCatalogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocal(entries: CustomCatalogEntry[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
}

async function readCommunity(): Promise<CommunityCatalogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(COMMUNITY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CommunityCatalogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeCommunity(entries: CommunityCatalogEntry[]): Promise<void> {
  await AsyncStorage.setItem(COMMUNITY_KEY, JSON.stringify(entries));
}

/** Save a user-added item so it appears in future searches on this device. */
export async function registerCustomGroceryItem(name: string, category?: string): Promise<CustomCatalogEntry> {
  const entry = buildCatalogEntry(name, category);
  const local = await readLocal();
  const existingIndex = local.findIndex((item) => item.itemKey === entry.itemKey);
  if (existingIndex >= 0) {
    local[existingIndex] = { ...local[existingIndex], ...entry };
  } else {
    local.push(entry);
  }
  local.sort((a, b) => a.displayName.localeCompare(b.displayName));
  await writeLocal(local);
  await contributeToCommunityCatalog(entry);
  return entry;
}

/** Local community cache — ready to swap for remote catalog API sync. */
export async function contributeToCommunityCatalog(entry: CustomCatalogEntry): Promise<void> {
  const community = await readCommunity();
  const now = new Date().toISOString();
  const idx = community.findIndex((item) => item.itemKey === entry.itemKey);
  if (idx >= 0) {
    community[idx] = {
      ...community[idx],
      displayName: entry.displayName,
      canonicalName: entry.canonicalName,
      category: entry.category,
      emoji: entry.emoji,
      contributions: community[idx].contributions + 1,
      lastContributedAt: now,
    };
  } else {
    community.push({
      ...entry,
      contributions: 1,
      lastContributedAt: now,
    });
  }
  community.sort((a, b) => a.displayName.localeCompare(b.displayName));
  await writeCommunity(community);
}

export async function getCustomCatalogEntries(): Promise<CustomCatalogEntry[]> {
  return readLocal();
}

export async function getCommunityCatalogEntries(): Promise<CommunityCatalogEntry[]> {
  return readCommunity();
}

/** Merged local + community entries for picker search (deduped by itemKey). */
export async function getSearchableCustomEntries(): Promise<CustomCatalogEntry[]> {
  const [local, community] = await Promise.all([readLocal(), readCommunity()]);
  const byKey = new Map<string, CustomCatalogEntry>();
  for (const entry of [...community, ...local]) {
    byKey.set(entry.itemKey, entry);
  }
  return Array.from(byKey.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
}
