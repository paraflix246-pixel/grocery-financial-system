import Fuse from 'fuse.js';

import {
  buildCustomStore,
  CATALOG_STORES,
  type StoreDefinition,
} from '@/src/data/stores';
import {
  getCustomStores,
  saveCustomStore,
} from '@/src/services/storageService';

const FUZZY_THRESHOLD = 0.35;

let catalogFuse: Fuse<StoreDefinition> | null = null;

const STORE_ALIASES: Record<string, string[]> = {
  walmart: ['wal mart', 'wal-mart', 'walmart supercenter', 'walmart neighborhood market'],
  target: ['target store', 'target t'],
  kroger: ['kroger marketplace', 'kroger food stores'],
  costco: ['costco wholesale', 'costco warehouse'],
  aldi: ['aldi food market', 'aldi market'],
};

function getCatalogFuse(): Fuse<StoreDefinition> {
  if (!catalogFuse) {
    catalogFuse = new Fuse(CATALOG_STORES, {
      keys: ['name', 'id'],
      threshold: FUZZY_THRESHOLD,
      includeScore: true,
    });
  }
  return catalogFuse;
}

function normalizeStoreName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/#\s*\d+/g, ' ')
    .replace(/\b(?:no|number|store|location|loc)\s*\d+\b/g, ' ')
    .replace(/\b\d{3,}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactStoreName(name: string): string {
  return normalizeStoreName(name).replace(/\s+/g, '');
}

function isLikelyStoreMatch(input: string, store: StoreDefinition): boolean {
  const normalizedInput = normalizeStoreName(input);
  const normalizedStore = normalizeStoreName(store.name);
  const compactInput = compactStoreName(input);
  const compactStore = compactStoreName(store.name);

  if (!normalizedInput || !normalizedStore) return false;
  if (normalizedInput === normalizedStore || compactInput === compactStore) return true;

  const aliases = STORE_ALIASES[store.id] ?? [];
  if (aliases.some((alias) => {
    const normalizedAlias = normalizeStoreName(alias);
    const compactAlias = compactStoreName(alias);
    return normalizedInput.includes(normalizedAlias) || compactInput.includes(compactAlias);
  })) {
    return true;
  }

  return normalizedStore.length >= 4 && normalizedInput.includes(normalizedStore);
}

export function matchStoreByName(name: string, stores?: StoreDefinition[]): StoreDefinition | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const pool = stores ?? CATALOG_STORES;
  const exact = pool.find((s) => isLikelyStoreMatch(trimmed, s));
  if (exact) return exact;

  const fuse = new Fuse(pool, {
    keys: ['name'],
    threshold: FUZZY_THRESHOLD,
    includeScore: true,
  });
  const match = fuse.search(trimmed)[0];
  if (match?.score != null && match.score <= FUZZY_THRESHOLD) {
    return match.item;
  }

  const catalogMatch = getCatalogFuse().search(trimmed)[0];
  if (catalogMatch?.score != null && catalogMatch.score <= FUZZY_THRESHOLD) {
    return catalogMatch.item;
  }

  return null;
}

export async function getAllStores(): Promise<StoreDefinition[]> {
  const custom = await getCustomStores();
  const seen = new Set<string>();
  const merged: StoreDefinition[] = [];

  for (const store of [...CATALOG_STORES, ...custom]) {
    const key = normalizeStoreName(store.name);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(store);
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

export async function registerStoreFromReceipt(storeName: string): Promise<StoreDefinition | null> {
  const trimmed = storeName.trim();
  if (!trimmed) return null;

  const allStores = await getAllStores();
  const existing = matchStoreByName(trimmed, allStores);
  if (existing) return existing;

  const custom = buildCustomStore(trimmed);
  await saveCustomStore(custom);
  return custom;
}

export async function resolveStore(name: string): Promise<StoreDefinition> {
  const allStores = await getAllStores();
  return matchStoreByName(name, allStores) ?? buildCustomStore(name);
}

export function getCatalogStoreNames(): string[] {
  return CATALOG_STORES.map((s) => s.name);
}
