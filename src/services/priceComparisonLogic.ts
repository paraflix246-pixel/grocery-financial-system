export type ComparableStorePrice = {
  store: string;
  price: number;
  source: 'history' | 'estimate' | 'community' | 'api';
  productLabel?: string;
};

export type ItemStorePriceRow = {
  store: string;
  price: number;
  source: ComparableStorePrice['source'];
  productLabel?: string;
  isCheapest: boolean;
};

export function buildAlignedStoreRows(
  storeNames: string[],
  prices: ComparableStorePrice[]
): ItemStorePriceRow[] {
  if (prices.length === 0) return [];

  const priceMap = new Map(prices.map((entry) => [entry.store.toLowerCase(), entry]));
  const rows: ItemStorePriceRow[] = [];

  for (const store of storeNames) {
    const entry = priceMap.get(store.toLowerCase());
    if (!entry) continue;
    rows.push({
      store: entry.store,
      price: entry.price,
      source: entry.source,
      productLabel: entry.productLabel,
      isCheapest: false,
    });
  }

  if (rows.length === 0) return [];

  const cheapestPrice = Math.min(...rows.map((row) => row.price));
  for (const row of rows) {
    row.isCheapest = Math.abs(row.price - cheapestPrice) < 0.005;
  }

  return rows.sort((a, b) => a.price - b.price);
}

export function getItemPriceSpreadSavings(
  storeRows: ItemStorePriceRow[],
  quantity: number
): number {
  if (storeRows.length < 2) return 0;
  const cheapest = storeRows[0].price;
  const priciest = storeRows[storeRows.length - 1].price;
  return Math.max(0, (priciest - cheapest) * quantity);
}

/** Subtitle for savings banner — based on visible store rows only (not off-catalog prices). */
export function getSavingsSubtitleForStoreRows(storeRows: ItemStorePriceRow[]): string {
  if (storeRows.length === 0) return 'estimated across stores';

  if (storeRows.every((row) => row.source === 'estimate')) {
    return 'Estimated prices — scan receipts or set ZIP for live data';
  }

  const sources = new Set(storeRows.map((row) => row.source));
  if (sources.has('api')) return 'Live prices where available';

  const hasHistory = sources.has('history');
  const hasCommunity = sources.has('community');
  const hasEstimate = sources.has('estimate');

  if (hasHistory && hasCommunity) return 'from receipts & community';
  if (hasCommunity) return 'from community prices';
  if (hasHistory && hasEstimate) return 'from receipts & estimates';
  if (hasHistory) return 'from your receipts';
  if (hasCommunity && hasEstimate) return 'from community & estimates';

  return 'estimated across stores';
}

export type DisplayedPriceSpread = {
  cheapestStore: string;
  cheapestPrice: number;
  priciestStore: string;
  priciestPrice: number;
};

export function getDisplayedPriceSpread(storeRows: ItemStorePriceRow[]): DisplayedPriceSpread | null {
  if (storeRows.length < 2) return null;
  const cheapest = storeRows[0];
  const priciest = storeRows[storeRows.length - 1];
  if (cheapest.price >= priciest.price) return null;
  return {
    cheapestStore: cheapest.store,
    cheapestPrice: cheapest.price,
    priciestStore: priciest.store,
    priciestPrice: priciest.price,
  };
}
