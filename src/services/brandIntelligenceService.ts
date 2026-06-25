import {
  BRAND_OWNERSHIP_DATA,
  type BrandOwnershipEntry,
} from '@/src/data/brandData';
import { searchGroceryCatalog } from '@/src/data/groceryCatalog';

export type BrandMatchType = 'brand' | 'product' | 'related_brand' | 'owner' | 'catalog';

export type BrandIntelligenceResult = {
  entry: BrandOwnershipEntry;
  matchType: BrandMatchType;
  matchedOn: string;
  siblingBrands: string[];
  sameParentBrands: BrandOwnershipEntry[];
  alternativeBrands: BrandOwnershipEntry[];
};

type ScoredCandidate = {
  entry: BrandOwnershipEntry;
  matchType: BrandMatchType;
  matchedOn: string;
  score: number;
};

const POPULAR_BRAND_NAMES = [
  'Oreo',
  'Cheerios',
  'Kraft',
  'Tide',
  'Coca-Cola',
  'Great Value',
  'Kirkland Signature',
] as const;

/** Brand keywords → ownership entry (longest keyword wins on conflict). */
const brandKeywordIndex = buildBrandKeywordIndex();

function buildBrandKeywordIndex(): Map<string, BrandOwnershipEntry> {
  const index = new Map<string, BrandOwnershipEntry>();

  const register = (keyword: string, entry: BrandOwnershipEntry) => {
    const key = keyword.trim().toLowerCase();
    if (!key || key.length < 2) return;
    index.set(key, entry);
  };

  for (const entry of BRAND_OWNERSHIP_DATA) {
    register(entry.brand, entry);
    register(entry.owner, entry);
    for (const related of entry.relatedBrands) {
      register(related, entry);
    }
    for (const alias of entry.productAliases ?? []) {
      register(alias, entry);
    }
  }

  return index;
}

function findBrandByKeyword(text: string): BrandOwnershipEntry | undefined {
  const lower = text.toLowerCase();
  let best: { entry: BrandOwnershipEntry; len: number } | undefined;

  for (const [keyword, entry] of brandKeywordIndex) {
    if (lower.includes(keyword)) {
      if (!best || keyword.length > best.len) {
        best = { entry, len: keyword.length };
      }
    }
  }

  return best?.entry;
}

function scoreDirectMatch(query: string, entry: BrandOwnershipEntry): ScoredCandidate[] {
  const key = query.trim().toLowerCase();
  if (!key) return [];

  const candidates: ScoredCandidate[] = [];
  const brand = entry.brand.toLowerCase();
  const owner = entry.owner.toLowerCase();

  if (brand === key) {
    candidates.push({ entry, matchType: 'brand', matchedOn: entry.brand, score: 100 });
  } else if (brand.startsWith(key)) {
    candidates.push({ entry, matchType: 'brand', matchedOn: entry.brand, score: 90 });
  } else if (brand.includes(key)) {
    candidates.push({ entry, matchType: 'brand', matchedOn: entry.brand, score: 80 });
  }

  for (const related of entry.relatedBrands) {
    const relatedKey = related.toLowerCase();
    if (relatedKey === key) {
      candidates.push({ entry, matchType: 'related_brand', matchedOn: related, score: 85 });
    } else if (relatedKey.includes(key) || key.includes(relatedKey)) {
      candidates.push({ entry, matchType: 'related_brand', matchedOn: related, score: 70 });
    }
  }

  for (const alias of entry.productAliases ?? []) {
    const aliasKey = alias.toLowerCase();
    if (aliasKey === key) {
      candidates.push({ entry, matchType: 'product', matchedOn: alias, score: 88 });
    } else if (aliasKey.includes(key) || key.includes(aliasKey)) {
      candidates.push({ entry, matchType: 'product', matchedOn: alias, score: 65 });
    }
  }

  if (owner === key) {
    candidates.push({ entry, matchType: 'owner', matchedOn: entry.owner, score: 75 });
  } else if (owner.includes(key)) {
    candidates.push({ entry, matchType: 'owner', matchedOn: entry.owner, score: 50 });
  }

  return candidates;
}

function scoreCatalogBridge(query: string): ScoredCandidate[] {
  const catalogHits = searchGroceryCatalog(query, 5);
  const candidates: ScoredCandidate[] = [];
  const seen = new Set<string>();

  for (const item of catalogHits) {
    const texts = [item.canonicalName, item.name, ...(item.aliases ?? [])];
    for (const text of texts) {
      const entry = findBrandByKeyword(text);
      if (entry && !seen.has(entry.brand)) {
        seen.add(entry.brand);
        candidates.push({
          entry,
          matchType: 'catalog',
          matchedOn: item.canonicalName,
          score: 55,
        });
      }
    }
  }

  const directFromQuery = findBrandByKeyword(query);
  if (directFromQuery && !seen.has(directFromQuery.brand)) {
    candidates.push({
      entry: directFromQuery,
      matchType: 'product',
      matchedOn: query.trim(),
      score: 60,
    });
  }

  return candidates;
}

function pickBestCandidate(candidates: ScoredCandidate[]): ScoredCandidate | undefined {
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => b.score - a.score || a.entry.brand.localeCompare(b.entry.brand))[0];
}

function getSiblingBrands(entry: BrandOwnershipEntry): string[] {
  return entry.relatedBrands;
}

function getSameParentBrands(entry: BrandOwnershipEntry): BrandOwnershipEntry[] {
  const ownerKey = entry.owner.toLowerCase();
  return BRAND_OWNERSHIP_DATA.filter(
    (other) =>
      other.brand !== entry.brand &&
      other.owner.toLowerCase() === ownerKey
  );
}

function getAlternativeBrands(entry: BrandOwnershipEntry): BrandOwnershipEntry[] {
  if (!entry.category) return [];
  return BRAND_OWNERSHIP_DATA.filter(
    (other) =>
      other.brand !== entry.brand &&
      other.category === entry.category &&
      other.owner !== entry.owner
  );
}

export function searchBrandIntelligence(query: string): BrandIntelligenceResult | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const candidates: ScoredCandidate[] = [];
  for (const entry of BRAND_OWNERSHIP_DATA) {
    candidates.push(...scoreDirectMatch(trimmed, entry));
  }
  candidates.push(...scoreCatalogBridge(trimmed));

  const best = pickBestCandidate(candidates);
  if (!best) return null;

  return {
    entry: best.entry,
    matchType: best.matchType,
    matchedOn: best.matchedOn,
    siblingBrands: getSiblingBrands(best.entry),
    sameParentBrands: getSameParentBrands(best.entry),
    alternativeBrands: getAlternativeBrands(best.entry),
  };
}

export function getPopularBrandEntries(): BrandOwnershipEntry[] {
  return POPULAR_BRAND_NAMES.map((name) =>
    BRAND_OWNERSHIP_DATA.find((entry) => entry.brand === name)
  ).filter((entry): entry is BrandOwnershipEntry => entry != null);
}

export function getMatchTypeLabel(matchType: BrandMatchType): string {
  switch (matchType) {
    case 'brand':
      return 'Brand match';
    case 'product':
      return 'Product match';
    case 'related_brand':
      return 'Related brand';
    case 'owner':
      return 'Parent company';
    case 'catalog':
      return 'Product catalog';
    default:
      return 'Match';
  }
}
