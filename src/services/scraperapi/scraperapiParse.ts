import type { WalmartSearchItem } from '@/src/services/scraperapi/scraperapiTypes';
import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

const WALMART_STORE = 'Walmart';

/** Size/unit tokens that appear in item names but not Walmart product titles. */
const SEARCH_UNIT_TOKENS = new Set([
  'lb',
  'lbs',
  'oz',
  'fl',
  'gal',
  'gallon',
  'pack',
  'count',
  'ct',
  'each',
  'per',
]);

function tokenizeSearchTerm(term: string): string[] {
  return term
    .toLowerCase()
    .split(/[\s,/+-]+/)
    .map((token) => token.replace(/[^\w]/g, ''))
    .filter((token) => token.length >= 2 && !SEARCH_UNIT_TOKENS.has(token));
}

function scoreSearchRelevance(title: string, searchTerm: string): number {
  const tokens = tokenizeSearchTerm(searchTerm);
  if (tokens.length === 0) return 1;

  const titleLower = title.toLowerCase();
  let matched = 0;
  for (const token of tokens) {
    if (titleLower.includes(token)) matched += 1;
  }
  return matched / tokens.length;
}

export function isRelevantWalmartProduct(title: string, searchTerm: string): boolean {
  const tokens = tokenizeSearchTerm(searchTerm);
  if (tokens.length === 0) return true;
  const titleLower = title.toLowerCase();
  return tokens.every((token) => titleLower.includes(token));
}

export function rankWalmartSearchItems(
  items: WalmartSearchItem[],
  searchTerm: string
): WalmartSearchItem[] {
  const relevant = items.filter((item) => isRelevantWalmartProduct(item.title, searchTerm));
  const pool = relevant.length > 0 ? relevant : items;

  return [...pool].sort((a, b) => {
    const relevanceDiff = scoreSearchRelevance(b.title, searchTerm) - scoreSearchRelevance(a.title, searchTerm);
    if (relevanceDiff !== 0) return relevanceDiff;
    return a.price - b.price;
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractNextDataJson(html: string): unknown | null {
  const marker = '<script id="__NEXT_DATA__"';
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) return null;

  const jsonStart = html.indexOf('>', startIdx);
  if (jsonStart === -1) return null;

  const jsonEnd = html.indexOf('</script>', jsonStart);
  if (jsonEnd === -1) return null;

  try {
    return JSON.parse(html.slice(jsonStart + 1, jsonEnd));
  } catch {
    return null;
  }
}

function readNumericPrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  const record = asRecord(value);
  if (typeof record?.price === 'number' && record.price > 0) {
    return record.price;
  }

  return null;
}

function parsePriceString(value: string): number | null {
  const match = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractPriceFromItem(item: Record<string, unknown>): number | null {
  const priceInfo = asRecord(item.priceInfo);
  if (priceInfo) {
    for (const key of ['currentPrice', 'linePrice', 'itemPrice', 'memberPrice'] as const) {
      const price = readNumericPrice(priceInfo[key]);
      if (price != null) return price;
    }

    if (typeof priceInfo.price === 'number' && priceInfo.price > 0) {
      return priceInfo.price;
    }

    if (typeof priceInfo.priceString === 'string') {
      const parsed = parsePriceString(priceInfo.priceString);
      if (parsed != null) return parsed;
    }
  }

  return readNumericPrice(item.price);
}

function extractTitleFromItem(item: Record<string, unknown>): string | null {
  const name = item.name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  const title = item.title;
  if (typeof title === 'string' && title.trim()) return title.trim();
  return null;
}

function collectSearchItemsFromNextData(data: unknown): WalmartSearchItem[] {
  const root = asRecord(data);
  const props = asRecord(root?.props);
  const pageProps = asRecord(props?.pageProps);
  const initialData = asRecord(pageProps?.initialData);
  const searchResult = asRecord(initialData?.searchResult);
  const itemStacks = searchResult?.itemStacks;

  if (!Array.isArray(itemStacks)) return [];

  const results: WalmartSearchItem[] = [];

  for (const stack of itemStacks) {
    const stackRecord = asRecord(stack);
    const items = stackRecord?.items;
    if (!Array.isArray(items)) continue;

    for (const rawItem of items) {
      appendWalmartProduct(rawItem, results);
    }
  }

  return results;
}

function appendWalmartProduct(rawItem: unknown, results: WalmartSearchItem[]): void {
  const item = asRecord(rawItem);
  if (!item) return;

  const typename = item.__typename;
  if (typeof typename !== 'string') return;
  if (typename !== 'Product' && typename !== 'ProductCard') return;

  const title = extractTitleFromItem(item);
  const price = extractPriceFromItem(item);
  if (!title || price == null) return;

  results.push({ title, price });
}

function collectProductNodesFromJson(
  node: unknown,
  results: WalmartSearchItem[],
  depth = 0
): void {
  if (depth > 24) return;

  const record = asRecord(node);
  if (!record) return;

  appendWalmartProduct(record, results);

  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        collectProductNodesFromJson(entry, results, depth + 1);
      }
      continue;
    }

    if (value && typeof value === 'object') {
      collectProductNodesFromJson(value, results, depth + 1);
    }
  }
}

function parseWalmartSearchHtmlFallback(html: string): WalmartSearchItem[] {
  const results: WalmartSearchItem[] = [];
  const pattern =
    /"name"\s*:\s*"((?:\\.|[^"\\])*)"\s*,[\s\S]{0,400}?"currentPrice"\s*:\s*\{\s*"price"\s*:\s*(\d+(?:\.\d+)?)/g;

  for (const match of html.matchAll(pattern)) {
    const title = match[1]?.replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
    const price = Number(match[2]);
    if (!title || !Number.isFinite(price) || price <= 0) continue;
    results.push({ title, price });
  }

  return results;
}

export function parseWalmartSearchHtml(html: string): WalmartSearchItem[] {
  if (!html.trim()) return [];

  const nextData = extractNextDataJson(html);
  if (nextData) {
    const stackItems = collectSearchItemsFromNextData(nextData);
    const recursiveItems: WalmartSearchItem[] = [];
    collectProductNodesFromJson(nextData, recursiveItems);
    const merged = dedupeWalmartItems([...stackItems, ...recursiveItems]);
    if (merged.length > 0) return merged;
  }

  return dedupeWalmartItems(parseWalmartSearchHtmlFallback(html));
}

function dedupeWalmartItems(items: WalmartSearchItem[]): WalmartSearchItem[] {
  const byTitle = new Map<string, WalmartSearchItem>();

  for (const item of items) {
    const key = item.title.toLowerCase();
    const existing = byTitle.get(key);
    if (!existing || item.price < existing.price) {
      byTitle.set(key, item);
    }
  }

  return [...byTitle.values()].sort((a, b) => a.price - b.price);
}

export function mapWalmartResultsToQuotes(
  items: WalmartSearchItem[],
  itemName: string,
  _limit = 8
): PriceQuote[] {
  const today = new Date().toISOString().slice(0, 10);
  const ranked = rankWalmartSearchItems(
    items.filter((item) => item.price > 0),
    itemName
  );
  const tokens = tokenizeSearchTerm(itemName);
  const minScore = tokens.length >= 2 ? 0.5 : tokens.length === 1 ? 1 : 0;
  const candidates =
    tokens.length === 0
      ? ranked
      : ranked.filter((item) => scoreSearchRelevance(item.title, itemName) >= minScore);
  if (candidates.length === 0) return [];

  const best = candidates[0];
  return [
    {
      itemName,
      storeName: WALMART_STORE,
      price: best.price,
      date: today,
      source: 'api',
      productLabel: best.title,
    },
  ];
}
