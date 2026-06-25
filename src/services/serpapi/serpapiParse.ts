import type { SerpApiShoppingResult } from '@/src/services/serpapi/serpapiTypes';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

const STORE_SUFFIXES = ['.com', ' - Grocery', ' Grocery'];

export function normalizeSerpApiStoreName(source: string): string {
  let name = source.trim();
  for (const suffix of STORE_SUFFIXES) {
    if (name.toLowerCase().endsWith(suffix.toLowerCase())) {
      name = name.slice(0, -suffix.length).trim();
    }
  }
  return name || source.trim();
}

export function mapSerpApiResultsToQuotes(
  results: SerpApiShoppingResult[],
  itemName: string,
  limit = 8
): PriceQuote[] {
  const today = new Date().toISOString().slice(0, 10);
  const byStore = new Map<string, PriceQuote>();

  for (const result of results) {
    if (result.second_hand_condition) continue;
    const price = result.extracted_price;
    const source = result.source?.trim();
    if (price == null || price <= 0 || !source) continue;

    const storeName = normalizeSerpApiStoreName(source);
    const existing = byStore.get(storeName.toLowerCase());
    if (existing && existing.price <= price) continue;

    byStore.set(storeName.toLowerCase(), {
      itemName,
      storeName,
      price,
      date: today,
      source: 'api',
      productLabel: result.title?.trim() || undefined,
    });
  }

  return [...byStore.values()]
    .sort((a, b) => a.price - b.price)
    .slice(0, limit);
}
