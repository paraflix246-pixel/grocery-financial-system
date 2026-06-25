import { GROCERY_CATEGORIES, getGroceryItemByCanonical, getGroceryItemByName } from '@/src/data/groceryCatalog';
import type { GroceryCategory } from '@/src/data/groceryCatalog';

export const PANTRY_CATEGORIES = ['All', ...GROCERY_CATEGORIES] as const;
export type PantryCategoryFilter = (typeof PANTRY_CATEGORIES)[number];

/** Catch-all when auto-grouping is uncertain — user can recategorize in Pantry. */
export const PANTRY_FALLBACK_CATEGORY: GroceryCategory = 'Other';

const VAGUE_RECEIPT_LINE_RE =
  /^(produce|snacks?|frozen\s+food|cleaning\s+items?|grocery|food|misc|items?|pantry|frozen|meat|dairy|beverages?)$/i;

const PET_FOOD_RE = /\b(cat|dog|pet)\s+food\b/i;

type CategoryPattern = { category: GroceryCategory; pattern: RegExp };

const CONFIDENT_CATEGORY_PATTERNS: CategoryPattern[] = [
  { category: 'Beverages', pattern: /\b(soda|juice|coffee|\btea\b|gatorade|cola|lemonade|sparkling\s+water)\b/i },
  { category: 'Dairy', pattern: /\b(milk|cheese|yogurt|butter|cream)\b/i },
  { category: 'Dairy', pattern: /\begg(s)?\b/i },
  { category: 'Produce', pattern: /\b(banana|apple|berry|lettuce|tomato|tomatoes|carrot|onion|potato|salad|grape|avocado|broccoli|spinach)\b/i },
  { category: 'Meat', pattern: /\b(chicken|beef|pork|turkey|sausage|steak|ribeye|salmon|fillet|chop|wing|drumstick|ham|bacon)\b/i },
  { category: 'Bakery', pattern: /\b(bread|bagel|croissant|muffin|roll|bun|tortilla|wheat)\b/i },
  { category: 'Frozen', pattern: /\b(frozen|ice\s+cream)\b/i },
  { category: 'Snacks', pattern: /\b(chip|cracker|pretzel|candy|cookie|chocolate|hershey|snack)\b/i },
  { category: 'Household', pattern: /\b(paper|soap|detergent|diapers?|towel|tissue|cleaner|bleach|trash|laundry)\b/i },
  { category: 'Pantry', pattern: /\b(rice|pasta|flour|sugar|oil|bean|lentil|cereal|cerea|soup|broth|spaghetti|macaroni)\b/i },
];

export function isVaguePantryLineName(name: string): boolean {
  const normalized = name.trim().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return true;
  return VAGUE_RECEIPT_LINE_RE.test(normalized);
}

function matchConfidentCategory(name: string): GroceryCategory | null {
  for (const { category, pattern } of CONFIDENT_CATEGORY_PATTERNS) {
    if (pattern.test(name)) return category;
  }
  return null;
}

export function inferPantryCategory(name: string, canonicalName?: string): GroceryCategory {
  const candidates = [canonicalName, name].filter((value): value is string => Boolean(value?.trim()));
  for (const candidate of candidates) {
    const catalog = getGroceryItemByCanonical(candidate) ?? getGroceryItemByName(candidate);
    if (catalog) return catalog.category;
  }

  if (isVaguePantryLineName(name) || PET_FOOD_RE.test(name)) {
    return PANTRY_FALLBACK_CATEGORY;
  }

  return matchConfidentCategory(name) ?? PANTRY_FALLBACK_CATEGORY;
}

export function normalizePantryCategory(category: string | undefined): GroceryCategory {
  const trimmed = category?.trim();
  if (trimmed && GROCERY_CATEGORIES.includes(trimmed as GroceryCategory)) {
    return trimmed as GroceryCategory;
  }
  return PANTRY_FALLBACK_CATEGORY;
}
