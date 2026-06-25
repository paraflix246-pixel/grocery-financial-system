/**
 * Community pricing service — Supabase-backed.
 * All calls are fire-and-forget or gracefully return [] when Supabase is not configured.
 * No user PII is ever stored.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateId } from '@/src/utils/id';
import { supabase } from '@/src/services/supabaseClient';
import type { ExternalPriceSource } from '@/src/services/externalPriceService';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

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

const USER_ID_KEY = '@smartcart_community_user_id_v1';

const STORE_NAME_NORMALIZATIONS: Array<[RegExp, string]> = [
  [/^WAL-?MART(\s+SUPERCENTER)?(\s+#\d+)?$/i, 'Walmart'],
  [/^TARGET(\s+STORE)?(\s+#\d+)?$/i, 'Target'],
  [/^WHOLE\s+FOODS(\s+MARKET)?$/i, 'Whole Foods'],
  [/^KROGER(\s+STORE)?(\s+#\d+)?$/i, 'Kroger'],
  [/^SAFEWAY(\s+STORE)?(\s+#\d+)?$/i, 'Safeway'],
  [/^PUBLIX(\s+SUPER\s+MARKETS?)?$/i, 'Publix'],
  [/^TRADER\s+JOE['']?S?$/i, "Trader Joe's"],
  [/^COSTCO(\s+WHOLESALE)?$/i, 'Costco'],
  [/^ALDI(\s+STORE)?(\s+#\d+)?$/i, 'ALDI'],
  [/^H[-\s]E[-\s]B(\s+GROCERY)?$/i, 'H-E-B'],
  [/^MEIJER(\s+STORE)?(\s+#\d+)?$/i, 'Meijer'],
  [/^FOOD\s+LION$/i, 'Food Lion'],
  [/^GIANT\s+FOOD$/i, 'Giant Food'],
  [/^STOP\s*&?\s*SHOP$/i, 'Stop & Shop'],
  [/^WINN[-\s]DIXIE$/i, 'Winn-Dixie'],
  [/^WEGMANS(\s+FOOD\s+MARKETS?)?$/i, 'Wegmans'],
  [/^HARRIS\s+TEETER$/i, 'Harris Teeter'],
  [/^SPROUTS(\s+FARMERS?\s+MARKET)?$/i, 'Sprouts'],
];

function normalizeStoreName(name: string): string {
  const trimmed = name.trim();
  for (const [pattern, replacement] of STORE_NAME_NORMALIZATIONS) {
    if (pattern.test(trimmed)) return replacement;
  }
  return trimmed;
}

function normalizeItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function getOrCreateUserId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(USER_ID_KEY);
    if (existing) return existing;
    const newId = generateId();
    await AsyncStorage.setItem(USER_ID_KEY, newId);
    return newId;
  } catch {
    return generateId();
  }
}

/**
 * Contribute price observations to Supabase after a receipt is saved.
 * Fire-and-forget — never blocks UI, silently swallows errors.
 */
export async function savePriceRecords(
  items: Array<{ name: string; price: number }>,
  storeInfo: {
    storeName: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  },
  receiptDate: string
): Promise<void> {
  if (!supabase) return;

  try {
    const userId = await getOrCreateUserId();
    const storeName = normalizeStoreName(storeInfo.storeName);
    const scanDate = new Date().toISOString().split('T')[0];

    const rows = items
      .filter((item) => {
        const trimmedName = (item.name ?? '').trim();
        return trimmedName.length >= 3 && item.price > 0 && item.price <= 500;
      })
      .map((item) => ({
        item_name: normalizeItemName(item.name),
        price: item.price,
        store_name: storeName,
        store_address: storeInfo.address ?? null,
        store_city: storeInfo.city ?? null,
        store_state: storeInfo.state ?? null,
        store_zip: storeInfo.zip ?? null,
        scan_date: scanDate,
        receipt_date: receiptDate || null,
        user_id: userId,
      }));

    if (rows.length === 0) return;

    await supabase.from('price_records').insert(rows);
  } catch {
    // Never surface errors to the user
  }
}

/**
 * Find the cheapest stores for an item name across all community price records.
 * Groups by store, returns the most recent price per store, sorted by price ascending.
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
          storeName: row.store_name as string,
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

      // Get the Monday of the week
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

/**
 * ExternalPriceSource adapter — registers Supabase community prices into the
 * existing price comparison pipeline as a 'community' source.
 */
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
