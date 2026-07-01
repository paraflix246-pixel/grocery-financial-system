/**
 * Community pricing service — Supabase-backed.
 * All calls are fire-and-forget or gracefully return [] when Supabase is not configured.
 * No user PII is ever stored — contributions pass through communityPricePiiStripper.
 */
import { supabase } from '@/src/services/supabaseClient';
import type { ExternalPriceSource } from '@/src/services/externalPriceService';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';
import { normalizeCommunityStoreName } from '@/src/services/communityPricePiiStripper';
import { contributeCommunityPricesIfEnabled } from '@/src/services/receiptCommunityContributionService';

export type PriceTrendPoint = {
  date: string;
  avgPrice: number;
  sampleCount: number;
};

export type StorePriceSummary = {
  storeName: string;
  price: number;
  lastSeen: string;
  city?: string;
  state?: string;
};

function normalizeItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * @deprecated Prefer contributeCommunityPricesIfEnabled — respects privacy opt-in and PII stripping.
 */
export async function savePriceRecords(
  items: Array<{ name: string; price: number; quantity?: number }>,
  storeInfo: {
    storeName: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  },
  receiptDate: string
): Promise<void> {
  await contributeCommunityPricesIfEnabled(items, storeInfo, receiptDate);
}

/**
 * Find the cheapest stores for an item name across aggregated community price records.
 */
export async function searchCheapestStore(itemName: string): Promise<StorePriceSummary[]> {
  if (!supabase) return [];

  try {
    const normalized = normalizeItemName(itemName);
    if (normalized.length < 2) return [];

    const { data, error } = await supabase
      .from('price_records')
      .select('store_name, price, receipt_date, scan_date, store_city, store_state')
      .ilike('item_name', `%${normalized}%`)
      .order('scan_date', { ascending: false })
      .limit(500);

    if (error || !data || data.length === 0) return [];

    const byStore = new Map<
      string,
      { storeName: string; price: number; lastSeen: string; city?: string; state?: string }
    >();

    for (const row of data) {
      const key = (row.store_name as string).toLowerCase();
      const existing = byStore.get(key);
      const date = (row.receipt_date ?? row.scan_date) as string;
      if (!existing || date > existing.lastSeen) {
        byStore.set(key, {
          storeName: normalizeCommunityStoreName(row.store_name as string),
          price: row.price as number,
          lastSeen: date,
          city: (row.store_city as string | null) ?? undefined,
          state: (row.store_state as string | null) ?? undefined,
        });
      }
    }

    return [...byStore.values()].sort((a, b) => a.price - b.price);
  } catch {
    return [];
  }
}

/**
 * Get average price trend for an item over the past N months, grouped by week.
 */
export async function getPriceTrend(
  itemName: string,
  months: number
): Promise<PriceTrendPoint[]> {
  if (!supabase) return [];

  try {
    const normalized = normalizeItemName(itemName);
    if (normalized.length < 2) return [];

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('price_records')
      .select('price, receipt_date, scan_date')
      .ilike('item_name', `%${normalized}%`)
      .gte('scan_date', cutoffStr)
      .order('scan_date', { ascending: true })
      .limit(2000);

    if (error || !data || data.length === 0) return [];

    const weekBuckets = new Map<string, { prices: number[]; count: number }>();

    for (const row of data) {
      const rawDate = (row.receipt_date ?? row.scan_date) as string;
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) continue;

      const dayOfWeek = d.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diff);
      const weekKey = monday.toISOString().split('T')[0];

      const bucket = weekBuckets.get(weekKey) ?? { prices: [], count: 0 };
      bucket.prices.push(row.price as number);
      bucket.count += 1;
      weekBuckets.set(weekKey, bucket);
    }

    return [...weekBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({
        date,
        avgPrice: bucket.prices.reduce((s, p) => s + p, 0) / bucket.prices.length,
        sampleCount: bucket.count,
      }));
  } catch {
    return [];
  }
}

export function createSupabaseCommunityPriceProvider(): ExternalPriceSource {
  return {
    id: 'supabase-community',
    async getPricesForItem(itemName: string): Promise<PriceQuote[]> {
      const stores = await searchCheapestStore(itemName);
      return stores.map((store): PriceQuote => ({
        itemName,
        storeName: store.storeName,
        price: store.price,
        date: store.lastSeen,
        source: 'community',
      }));
    },
  };
}
