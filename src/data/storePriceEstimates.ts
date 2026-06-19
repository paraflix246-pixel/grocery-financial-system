import Fuse from 'fuse.js';

export const COMMON_STORES = ['Aldi', 'Walmart', 'Target', 'Kroger', 'Costco'] as const;

/** Normalized item key → store → unit price */
export const STORE_PRICE_ESTIMATES: Record<string, Partial<Record<(typeof COMMON_STORES)[number], number>>> = {
  milk: { Aldi: 2.89, Walmart: 3.19, Target: 3.49, Kroger: 3.29, Costco: 2.79 },
  eggs: { Aldi: 2.49, Walmart: 2.89, Target: 3.19, Kroger: 2.99, Costco: 4.99 },
  bread: { Aldi: 1.29, Walmart: 1.49, Target: 1.79, Kroger: 1.59, Costco: 2.49 },
  butter: { Aldi: 3.49, Walmart: 3.99, Target: 4.29, Kroger: 4.19, Costco: 3.79 },
  cheese: { Aldi: 2.99, Walmart: 3.49, Target: 3.79, Kroger: 3.69, Costco: 3.29 },
  chicken: { Aldi: 2.49, Walmart: 2.79, Target: 3.19, Kroger: 2.99, Costco: 2.29 },
  'ground beef': { Aldi: 4.49, Walmart: 4.99, Target: 5.49, Kroger: 5.29, Costco: 4.79 },
  bananas: { Aldi: 0.49, Walmart: 0.55, Target: 0.59, Kroger: 0.52, Costco: 0.45 },
  apples: { Aldi: 1.29, Walmart: 1.49, Target: 1.59, Kroger: 1.39, Costco: 1.19 },
  rice: { Aldi: 1.19, Walmart: 1.39, Target: 1.49, Kroger: 1.29, Costco: 1.09 },
  pasta: { Aldi: 0.89, Walmart: 1.09, Target: 1.19, Kroger: 1.05, Costco: 0.95 },
  cereal: { Aldi: 2.19, Walmart: 2.79, Target: 3.19, Kroger: 2.99, Costco: 2.49 },
  coffee: { Aldi: 4.99, Walmart: 5.99, Target: 6.49, Kroger: 5.79, Costco: 5.49 },
  yogurt: { Aldi: 0.59, Walmart: 0.69, Target: 0.79, Kroger: 0.65, Costco: 0.55 },
  lettuce: { Aldi: 1.49, Walmart: 1.79, Target: 1.99, Kroger: 1.69, Costco: 1.39 },
  tomatoes: { Aldi: 1.99, Walmart: 2.29, Target: 2.49, Kroger: 2.19, Costco: 1.89 },
  potatoes: { Aldi: 2.99, Walmart: 3.49, Target: 3.79, Kroger: 3.29, Costco: 2.79 },
  'orange juice': { Aldi: 2.79, Walmart: 3.19, Target: 3.49, Kroger: 3.29, Costco: 2.99 },
  'peanut butter': { Aldi: 2.49, Walmart: 2.99, Target: 3.29, Kroger: 2.89, Costco: 2.39 },
  'toilet paper': { Aldi: 6.99, Walmart: 7.99, Target: 8.49, Kroger: 7.49, Costco: 6.49 },
};

const estimateKeys = Object.keys(STORE_PRICE_ESTIMATES);
const estimateFuse = new Fuse(estimateKeys, { threshold: 0.4, includeScore: true });

export function normalizeItemName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findEstimatePrices(itemName: string): Partial<Record<(typeof COMMON_STORES)[number], number>> {
  const normalized = normalizeItemName(itemName);
  if (!normalized) return {};

  if (STORE_PRICE_ESTIMATES[normalized]) {
    return STORE_PRICE_ESTIMATES[normalized];
  }

  const matches = estimateFuse.search(normalized);
  const best = matches[0];
  if (best?.score != null && best.score <= 0.4) {
    return STORE_PRICE_ESTIMATES[best.item] ?? {};
  }

  return {};
}

export function getGenericStoreEstimates(
  itemName: string,
  storeNames: readonly string[] = COMMON_STORES
): Partial<Record<string, number>> {
  const specific = findEstimatePrices(itemName);
  if (Object.keys(specific).length > 0) {
    const result: Partial<Record<string, number>> = {};
    for (const store of storeNames) {
      const known = specific[store as (typeof COMMON_STORES)[number]];
      if (known != null) {
        result[store] = known;
      }
    }
    if (Object.keys(result).length > 0) return result;
  }

  const hash = normalizedHash(normalizeItemName(itemName));
  const base = 1.5 + (hash % 400) / 100;
  const result: Partial<Record<string, number>> = {};
  storeNames.forEach((store, i) => {
    const storeHash = normalizedHash(normalizeItemName(store));
    const multiplier = 0.82 + ((storeHash + i) % 12) * 0.025;
    result[store] = Math.round(base * multiplier * 100) / 100;
  });
  return result;
}

function normalizedHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
