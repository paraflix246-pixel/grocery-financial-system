import type { ReceiptLineKind } from '@/src/models/types';
import { isBuyAgainEligibleItem } from '@/src/utils/receiptMerchandiseFilter';

export type PriceQuoteSource = 'receipt' | 'community' | 'api' | 'estimate';

export type PriceQuote = {
  itemName: string;
  storeName: string;
  price: number;
  date: string;
  source: PriceQuoteSource;
  /** Matched product title/description when price comes from an external API. */
  productLabel?: string;
};

export type ReceiptItemRow = {
  name: string;
  price: number;
  quantity: number;
  storeName: string;
  receiptDate: string;
};

export type FrequentPurchasedItem = {
  name: string;
  canonicalName: string;
  purchaseCount: number;
  totalSpend: number;
  lastPurchaseDate: string;
};

export type LastPaidSnapshot = {
  price: number;
  store: string;
  date: string;
};

export type CheapestStoreRecommendation = {
  itemName: string;
  cheapestStore: string;
  cheapestPrice: number;
  cheapestSource: PriceQuoteSource;
  cheapestDate: string | null;
  lastPaidPrice: number | null;
  lastPaidStore: string | null;
  lastPaidDate: string | null;
  savingsVsLastPaid: number | null;
};

export type PriceRecommendation = {
  itemName: string;
  message: string;
  storeName: string;
  price: number;
  date: string;
  source: PriceQuoteSource;
  savingsVsLastPaid: number | null;
  kind: 'personal' | 'community' | 'api';
};

export type ReceiptItemRowWithKind = ReceiptItemRow & { lineKind?: ReceiptLineKind };

export function aggregateFrequentItems(
  items: ReceiptItemRowWithKind[],
  resolveCanonical: (name: string) => string | undefined,
  limit = 10
): FrequentPurchasedItem[] {
  const buckets = new Map<string, FrequentPurchasedItem>();

  for (const item of items) {
    if (!isBuyAgainEligibleItem(item.name, item.lineKind)) continue;
    const canonical = resolveCanonical(item.name) ?? item.name.trim();
    const key = canonical.toLowerCase();
    const qty = item.quantity > 0 ? item.quantity : 1;
    const spend = item.price * qty;

    const existing = buckets.get(key);
    if (existing) {
      existing.purchaseCount += qty;
      existing.totalSpend += spend;
      if (item.receiptDate.localeCompare(existing.lastPurchaseDate) > 0) {
        existing.lastPurchaseDate = item.receiptDate;
      }
    } else {
      buckets.set(key, {
        name: canonical,
        canonicalName: canonical,
        purchaseCount: qty,
        totalSpend: spend,
        lastPurchaseDate: item.receiptDate,
      });
    }
  }

  return [...buckets.values()]
    .sort((a, b) => b.purchaseCount - a.purchaseCount || b.totalSpend - a.totalSpend)
    .slice(0, limit);
}

export function getLastPaidForItem(
  items: ReceiptItemRow[],
  itemName: string,
  resolveCanonical: (name: string) => string | undefined
): LastPaidSnapshot | null {
  const target = (resolveCanonical(itemName) ?? itemName).toLowerCase();
  const matching = items
    .filter((row) => {
      const canonical = resolveCanonical(row.name) ?? row.name;
      return canonical.toLowerCase() === target;
    })
    .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));

  if (matching.length === 0) return null;

  const latest = matching[0];
  return { price: latest.price, store: latest.storeName, date: latest.receiptDate };
}

export function mergePriceQuotes(existing: PriceQuote[], incoming: PriceQuote[]): PriceQuote[] {
  const byStore = new Map<string, PriceQuote>();

  for (const quote of [...existing, ...incoming]) {
    const key = quote.storeName.toLowerCase();
    const prev = byStore.get(key);
    if (!prev || quote.price < prev.price) {
      byStore.set(key, quote);
    }
  }

  return [...byStore.values()].sort((a, b) => a.price - b.price);
}

export function buildCheapestStoreRecommendation(
  itemName: string,
  quotes: PriceQuote[],
  lastPaid: LastPaidSnapshot | null
): CheapestStoreRecommendation | null {
  if (quotes.length === 0) return null;

  const cheapest = quotes[0];
  const savings =
    lastPaid != null && lastPaid.price > cheapest.price
      ? lastPaid.price - cheapest.price
      : null;

  return {
    itemName,
    cheapestStore: cheapest.storeName,
    cheapestPrice: cheapest.price,
    cheapestSource: cheapest.source,
    cheapestDate: cheapest.date || null,
    lastPaidPrice: lastPaid?.price ?? null,
    lastPaidStore: lastPaid?.store ?? null,
    lastPaidDate: lastPaid?.date ?? null,
    savingsVsLastPaid: savings,
  };
}

export function buildPersonalRecommendations(
  frequentItems: FrequentPurchasedItem[],
  items: ReceiptItemRow[],
  resolveCanonical: (name: string) => string | undefined,
  minPurchaseCount = 2,
  limit = 5
): PriceRecommendation[] {
  const recommendations: PriceRecommendation[] = [];

  for (const frequent of frequentItems) {
    if (frequent.purchaseCount < minPurchaseCount) continue;

    const target = frequent.canonicalName.toLowerCase();
    const matching = items.filter((row) => {
      const canonical = resolveCanonical(row.name) ?? row.name;
      return canonical.toLowerCase() === target;
    });

    if (matching.length < 2) continue;

    const storeLatest = new Map<string, LastPaidSnapshot & { store: string }>();
    for (const row of matching) {
      const key = row.storeName.toLowerCase();
      const existing = storeLatest.get(key);
      if (!existing || row.receiptDate.localeCompare(existing.date) > 0) {
        storeLatest.set(key, {
          price: row.price,
          date: row.receiptDate,
          store: row.storeName,
        });
      }
    }

    if (storeLatest.size < 2) continue;

    const byPrice = [...storeLatest.values()].sort((a, b) => a.price - b.price);
    const cheapest = byPrice[0];
    const lastPaid = matching.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate))[0];

    if (cheapest.price >= lastPaid.price) continue;

    const savings = lastPaid.price - cheapest.price;
    if (savings < 0.01) continue;

    recommendations.push({
      itemName: frequent.canonicalName,
      message: `You often buy ${frequent.canonicalName} — ${cheapest.store} had it for $${cheapest.price.toFixed(2)}`,
      storeName: cheapest.store,
      price: cheapest.price,
      date: cheapest.date,
      source: 'receipt',
      savingsVsLastPaid: savings,
      kind: 'personal',
    });
  }

  return recommendations
    .sort((a, b) => (b.savingsVsLastPaid ?? 0) - (a.savingsVsLastPaid ?? 0))
    .slice(0, limit);
}

export function buildCommunityRecommendations(
  itemNames: string[],
  quotesByItem: Map<string, PriceQuote[]>,
  lastPaidByItem: Map<string, LastPaidSnapshot | null>,
  limit = 5
): PriceRecommendation[] {
  const recommendations: PriceRecommendation[] = [];

  for (const itemName of itemNames) {
    const quotes = quotesByItem.get(itemName.toLowerCase()) ?? [];
    const communityQuotes = quotes.filter((q) => q.source === 'community');
    if (communityQuotes.length === 0) continue;

    const cheapest = communityQuotes[0];
    const lastPaid = lastPaidByItem.get(itemName.toLowerCase()) ?? null;
    const savings =
      lastPaid != null && lastPaid.price > cheapest.price
        ? lastPaid.price - cheapest.price
        : null;

    recommendations.push({
      itemName,
      message: `${cheapest.storeName} shoppers paid $${cheapest.price.toFixed(2)} for ${itemName}`,
      storeName: cheapest.storeName,
      price: cheapest.price,
      date: cheapest.date,
      source: 'community',
      savingsVsLastPaid: savings,
      kind: 'community',
    });
  }

  return recommendations
    .sort((a, b) => (b.savingsVsLastPaid ?? 0) - (a.savingsVsLastPaid ?? 0))
    .slice(0, limit);
}
