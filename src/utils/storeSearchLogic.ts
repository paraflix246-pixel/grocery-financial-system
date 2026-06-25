import Fuse from 'fuse.js';

import type { StoreDefinition } from '@/src/data/stores';
import type { Receipt, StoreLocation } from '@/src/models/types';

export type StoreSearchResult = {
  key: string;
  name: string;
  source: 'recent' | 'catalog' | 'custom';
  region?: string;
  location?: StoreLocation;
  subtitle?: string;
};

export type RecentStoreEntry = {
  name: string;
  lastDate: string;
  receiptCount: number;
  location: StoreLocation;
};

function normalizeKey(name: string): string {
  return name.trim().toLowerCase();
}

function locationFromReceipt(receipt: Receipt): StoreLocation {
  return {
    storeAddress: receipt.storeAddress,
    storeCity: receipt.storeCity,
    storeRegion: receipt.storeRegion,
    storePostalCode: receipt.storePostalCode,
    storeCountry: receipt.storeCountry,
  };
}

function hasLocationData(location: StoreLocation): boolean {
  return Boolean(
    location.storeAddress?.trim() ||
      location.storeCity?.trim() ||
      location.storeRegion?.trim() ||
      location.storePostalCode?.trim()
  );
}

export function buildRecentStoreEntries(receipts: Receipt[]): RecentStoreEntry[] {
  const byName = new Map<string, RecentStoreEntry>();

  for (const receipt of receipts) {
    const name = receipt.storeName.trim();
    if (!name) continue;

    const key = normalizeKey(name);
    const location = locationFromReceipt(receipt);
    const existing = byName.get(key);

    if (!existing) {
      byName.set(key, {
        name,
        lastDate: receipt.date,
        receiptCount: 1,
        location: hasLocationData(location) ? location : {},
      });
      continue;
    }

    existing.receiptCount += 1;
    if (receipt.date > existing.lastDate) {
      existing.lastDate = receipt.date;
      if (hasLocationData(location)) {
        existing.location = location;
      }
    } else if (!hasLocationData(existing.location) && hasLocationData(location)) {
      existing.location = location;
    }
  }

  return [...byName.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

function storeToSearchResult(store: StoreDefinition, source: 'catalog' | 'custom'): StoreSearchResult {
  const location: StoreLocation | undefined = store.region
    ? { storeRegion: store.region.toUpperCase() }
    : undefined;

  return {
    key: `store:${store.id}`,
    name: store.name,
    source,
    region: store.region,
    location,
    subtitle: store.region ? `${store.region} · Saved store` : 'Saved store',
  };
}

function recentToSearchResult(entry: RecentStoreEntry): StoreSearchResult {
  const parts: string[] = [];
  if (entry.location.storeCity && entry.location.storeRegion) {
    parts.push(`${entry.location.storeCity}, ${entry.location.storeRegion}`);
  } else if (entry.location.storeRegion) {
    parts.push(entry.location.storeRegion);
  }
  const visitLabel = `${entry.receiptCount} receipt${entry.receiptCount === 1 ? '' : 's'}`;
  return {
    key: `recent:${normalizeKey(entry.name)}`,
    name: entry.name,
    source: 'recent',
    region: entry.location.storeRegion ?? undefined,
    location: hasLocationData(entry.location) ? entry.location : undefined,
    subtitle: parts.length > 0 ? `${parts.join(' · ')} · ${visitLabel}` : visitLabel,
  };
}

function dedupeResults(results: StoreSearchResult[]): StoreSearchResult[] {
  const seen = new Set<string>();
  const deduped: StoreSearchResult[] = [];
  for (const result of results) {
    const key = normalizeKey(result.name);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(result);
  }
  return deduped;
}

export function searchStoreSuggestions(input: {
  query: string;
  stores: StoreDefinition[];
  recentStores: RecentStoreEntry[];
  limit?: number;
}): StoreSearchResult[] {
  const limit = input.limit ?? 8;
  const query = input.query.trim();

  const catalogResults = input.stores.map((store) =>
    storeToSearchResult(store, store.isCustom ? 'custom' : 'catalog')
  );
  const recentResults = input.recentStores.map(recentToSearchResult);

  if (!query) {
    const favorites = catalogResults.filter((result) => {
      const store = input.stores.find((s) => s.name === result.name);
      return store?.isFavorite;
    });
    return dedupeResults([...recentResults.slice(0, 5), ...favorites]).slice(0, limit);
  }

  const fuse = new Fuse([...recentResults, ...catalogResults], {
    keys: ['name'],
    threshold: 0.4,
    includeScore: true,
  });

  return dedupeResults(fuse.search(query).map((match) => match.item)).slice(0, limit);
}

export function storeSearchSelectionToDraft(partial: {
  name: string;
  region?: string;
  location?: StoreLocation;
}): {
  storeName: string;
  storeAddress?: string;
  storeCity?: string;
  storeRegion?: string;
  storePostalCode?: string;
  storeCountry?: string;
} {
  const location = partial.location ?? {};
  return {
    storeName: partial.name,
    storeAddress: location.storeAddress,
    storeCity: location.storeCity,
    storeRegion: location.storeRegion ?? partial.region?.toUpperCase(),
    storePostalCode: location.storePostalCode,
    storeCountry: location.storeCountry,
  };
}
