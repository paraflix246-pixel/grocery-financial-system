/**
 * Crowdsourced / community pricing — local-first MVP.
 *
 * When users save receipts, anonymized price points are aggregated into a local cache.
 * Structure is ready for future API sync: replace loadCache/persistCache with remote
 * fetch/push while keeping CommunityPricePoint and ICrowdsourcedPricingProvider stable.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Fuse from 'fuse.js';

import type { Receipt } from '@/src/models/types';
import { FUZZY_MATCH_THRESHOLD } from '@/src/services/matchingService';

const CACHE_KEY = '@smartcart_community_prices_v1';

export type CommunityPricePoint = {
  /** Normalized item name (lowercase, trimmed) */
  itemKey: string;
  storeName: string;
  price: number;
  /** ISO date from receipt */
  observedAt: string;
  /** Anonymous contribution count for this bucket */
  contributions: number;
};

export type CommunityStorePrice = {
  store: string;
  avgPrice: number;
  sampleCount: number;
  latestDate: string;
};

/** Future API sync interface — implement remote provider without changing consumers. */
export interface ICrowdsourcedPricingProvider {
  contribute(points: CommunityPricePoint[]): Promise<void>;
  getPricesForItem(itemName: string): Promise<CommunityStorePrice[]>;
  sync?(): Promise<void>;
}

type CachePayload = {
  points: CommunityPricePoint[];
  lastSyncedAt: string | null;
};

function normalizeItemKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function loadCache(): Promise<CachePayload> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as CachePayload;
  } catch {
    // ignore corrupt cache
  }
  return { points: [], lastSyncedAt: null };
}

async function persistCache(payload: CachePayload): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

function mergePoint(
  existing: CommunityPricePoint[],
  point: CommunityPricePoint
): CommunityPricePoint[] {
  const idx = existing.findIndex(
    (p) =>
      p.itemKey === point.itemKey &&
      p.storeName.toLowerCase() === point.storeName.toLowerCase() &&
      p.observedAt === point.observedAt
  );
  if (idx >= 0) {
    const prev = existing[idx];
    const merged = [...existing];
    merged[idx] = {
      ...prev,
      price: (prev.price * prev.contributions + point.price) / (prev.contributions + 1),
      contributions: prev.contributions + 1,
    };
    return merged;
  }
  return [...existing, point];
}

/** Called after saveReceipt — contributes anonymized price observations. */
export async function contributeFromReceipt(receipt: Receipt): Promise<void> {
  const cache = await loadCache();
  let points = cache.points;

  for (const item of receipt.items ?? []) {
    const point: CommunityPricePoint = {
      itemKey: normalizeItemKey(item.name),
      storeName: receipt.storeName,
      price: item.price,
      observedAt: receipt.date,
      contributions: 1,
    };
    points = mergePoint(points, point);
  }

  await persistCache({ points, lastSyncedAt: cache.lastSyncedAt });
}

export async function getCommunityPricesForItem(itemName: string): Promise<CommunityStorePrice[]> {
  const cache = await loadCache();
  if (cache.points.length === 0) return [];

  const fuse = new Fuse(cache.points, {
    keys: ['itemKey'],
    threshold: 1 - FUZZY_MATCH_THRESHOLD,
    includeScore: true,
  });

  const matches = fuse.search(normalizeItemKey(itemName));
  const buckets = new Map<string, { prices: number[]; dates: string[]; count: number }>();

  for (const match of matches) {
    if (match.score == null || match.score > 1 - FUZZY_MATCH_THRESHOLD) continue;
    const p = match.item;
    const key = p.storeName.toLowerCase();
    const bucket = buckets.get(key) ?? { prices: [], dates: [], count: 0 };
    bucket.prices.push(p.price);
    bucket.dates.push(p.observedAt);
    bucket.count += p.contributions;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([storeKey, bucket]) => {
      const avg = bucket.prices.reduce((s, v) => s + v, 0) / bucket.prices.length;
      const latestDate = bucket.dates.sort((a, b) => b.localeCompare(a))[0];
      const storeName =
        cache.points.find((p) => p.storeName.toLowerCase() === storeKey)?.storeName ?? storeKey;
      return {
        store: storeName,
        avgPrice: avg,
        sampleCount: bucket.count,
        latestDate,
      };
    })
    .sort((a, b) => a.avgPrice - b.avgPrice);
}

export async function getCommunityPriceStats(): Promise<{
  totalPoints: number;
  uniqueItems: number;
  uniqueStores: number;
}> {
  const cache = await loadCache();
  const items = new Set(cache.points.map((p) => p.itemKey));
  const stores = new Set(cache.points.map((p) => p.storeName.toLowerCase()));
  return {
    totalPoints: cache.points.reduce((s, p) => s + p.contributions, 0),
    uniqueItems: items.size,
    uniqueStores: stores.size,
  };
}

/** Local provider — swap for RemoteCrowdsourcedPricingProvider when API ships. */
export const localCrowdsourcedProvider: ICrowdsourcedPricingProvider = {
  contribute: async (points) => {
    const cache = await loadCache();
    let merged = cache.points;
    for (const point of points) {
      merged = mergePoint(merged, point);
    }
    await persistCache({ points: merged, lastSyncedAt: new Date().toISOString() });
  },
  getPricesForItem: getCommunityPricesForItem,
};
