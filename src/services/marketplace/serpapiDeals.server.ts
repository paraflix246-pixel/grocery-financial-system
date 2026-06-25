import { normalizeSerpApiStoreName } from '@/src/services/serpapi/serpapiParse';
import type { SerpApiShoppingResult } from '@/src/services/serpapi/serpapiTypes';
import type { MarketplaceDeal } from '@/src/services/marketplace/marketplaceTypes';
import { searchSerpApiShoppingResults } from '@/src/services/serpapi/serpApi.server';

const SERPAPI_DEAL_SEARCHES = [
  { term: 'grocery sale produce', category: 'Produce', emoji: '🥬' },
  { term: 'grocery sale chicken', category: 'Meat', emoji: '🍗' },
  { term: 'grocery sale milk', category: 'Dairy', emoji: '🥛' },
] as const;

const KNOWN_GROCERY_STORES = new Set([
  'aldi',
  'walmart',
  'target',
  'costco',
  'kroger',
  'safeway',
  'publix',
  'whole foods',
  'trader joe',
  'sam\'s club',
  'heb',
]);

function isGroceryStore(source: string): boolean {
  const lower = source.toLowerCase();
  return [...KNOWN_GROCERY_STORES].some((store) => lower.includes(store));
}

function inferCategory(title: string, fallback: string): string {
  const lower = title.toLowerCase();
  if (/milk|cheese|yogurt|butter|cream/.test(lower)) return 'Dairy';
  if (/chicken|beef|pork|turkey|meat|fish|salmon/.test(lower)) return 'Meat';
  if (/produce|apple|banana|lettuce|tomato|vegetable|fruit|berry/.test(lower)) return 'Produce';
  if (/snack|chips|crackers|cookie|candy/.test(lower)) return 'Snacks';
  if (/paper towel|toilet paper|detergent|cleaning/.test(lower)) return 'Household';
  return fallback;
}

export function mapSerpApiResultsToDeals(
  results: SerpApiShoppingResult[],
  fallbackCategory: string,
  fallbackEmoji: string,
  limit = 4
): MarketplaceDeal[] {
  const deals: MarketplaceDeal[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.second_hand_condition) continue;
    const price = result.extracted_price;
    const source = result.source?.trim();
    const title = result.title?.trim();
    const link = result.link?.trim();
    if (price == null || price <= 0 || !source || !title || !link) continue;
    if (!isGroceryStore(source)) continue;

    const store = normalizeSerpApiStoreName(source);
    const id = `serpapi-${store.toLowerCase()}-${title.toLowerCase().slice(0, 40)}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const category = inferCategory(title, fallbackCategory);
    deals.push({
      id,
      title,
      store,
      discountLabel: `$${price.toFixed(2)}`,
      category,
      emoji: fallbackEmoji,
      url: link,
      source: 'serpapi',
      promoPrice: price,
    });
    if (deals.length >= limit) break;
  }

  return deals;
}

export async function fetchSerpApiGroceryDeals(limit = 6): Promise<MarketplaceDeal[]> {
  const deals: MarketplaceDeal[] = [];
  const seen = new Set<string>();

  for (const search of SERPAPI_DEAL_SEARCHES) {
    if (deals.length >= limit) break;
    const results = await searchSerpApiShoppingResults({ term: search.term, limit: 10 });
    const batch = mapSerpApiResultsToDeals(
      results,
      search.category,
      search.emoji,
      limit - deals.length
    );
    for (const deal of batch) {
      if (seen.has(deal.id)) continue;
      seen.add(deal.id);
      deals.push(deal);
      if (deals.length >= limit) break;
    }
  }

  return deals;
}
