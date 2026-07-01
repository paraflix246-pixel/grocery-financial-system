import { normalizeCommonsFoodTerm } from '@/src/services/commons/commonsImageLogic';

/** Tier A: verified Wikimedia Commons files for cart-comparison staples. */
export type CuratedFoodImageEntry = {
  /** Primary normalized lookup key (e.g. "bread"). */
  itemKey: string;
  /** Human-readable label for logging/tests. */
  displayName: string;
  /** Commons file name with spaces (e.g. "Loaf of bread.jpg"). */
  fileTitle: string;
  author?: string;
  license?: string;
};

/** Aliases map to a primary curated item key. */
const CURATED_ITEM_ALIASES: Record<string, string> = {
  'whole milk': 'milk',
  '2% milk': 'milk',
  'skim milk': 'milk',
  'white bread': 'bread',
  'sliced bread': 'bread',
  'white rice': 'rice',
  'brown rice': 'rice',
  'minced meat': 'ground beef',
  'hamburger meat': 'ground beef',
  'paper towel': 'paper towels',
  'cheddar': 'cheddar cheese',
  'coffee beans': 'coffee',
  'ground coffee': 'coffee',
};

export const CURATED_FOOD_IMAGES: readonly CuratedFoodImageEntry[] = [
  {
    itemKey: 'bread',
    displayName: 'Bread',
    fileTitle: 'Loaf of bread.jpg',
    author: 'Wikimedia Commons contributors',
    license: 'CC BY-SA 4.0',
  },
  {
    itemKey: 'milk',
    displayName: 'Milk',
    fileTitle: 'Glass of milk.jpg',
    license: 'CC BY-SA 4.0',
  },
  {
    itemKey: 'eggs',
    displayName: 'Eggs',
    fileTitle: 'Chicken eggs.jpg',
    license: 'CC BY-SA 3.0',
  },
  {
    itemKey: 'bananas',
    displayName: 'Bananas',
    fileTitle: 'Bananas.jpg',
    license: 'CC BY-SA 2.5',
  },
  {
    itemKey: 'rice',
    displayName: 'Rice',
    fileTitle: 'Cooked white rice.jpg',
    license: 'CC BY 2.0',
  },
  {
    itemKey: 'water',
    displayName: 'Water',
    fileTitle: 'Bottled water.jpg',
    license: 'CC BY-SA 4.0',
  },
  {
    itemKey: 'ground beef',
    displayName: 'Ground Beef',
    fileTitle: 'Minced meat.jpg',
    author: 'Melongena',
    license: 'CC BY-SA 4.0',
  },
  {
    itemKey: 'butter',
    displayName: 'Butter',
    fileTitle: 'Yak butter in Mongolia.jpg',
    license: 'CC0',
  },
  {
    itemKey: 'coffee',
    displayName: 'Coffee',
    fileTitle: 'Cup of coffee.jpg',
    license: 'CC BY-SA 3.0',
  },
  {
    itemKey: 'paper towels',
    displayName: 'Paper Towels',
    fileTitle: 'Paper towel.jpg',
    license: 'CC BY-SA 4.0',
  },
  {
    itemKey: 'cheddar cheese',
    displayName: 'Cheddar Cheese',
    fileTitle: 'Somerset-Cheddar.jpg',
    license: 'CC BY-SA 3.0',
  },
];

const curatedByKey = new Map(CURATED_FOOD_IMAGES.map((entry) => [entry.itemKey, entry]));

export function resolveCuratedItemKey(term: string): string | null {
  const normalized = normalizeCommonsFoodTerm(term);
  if (!normalized) return null;
  if (curatedByKey.has(normalized)) return normalized;
  const alias = CURATED_ITEM_ALIASES[normalized];
  if (alias && curatedByKey.has(alias)) return alias;
  return null;
}

export function lookupCuratedFoodImage(term: string): CuratedFoodImageEntry | null {
  const key = resolveCuratedItemKey(term);
  if (!key) return null;
  return curatedByKey.get(key) ?? null;
}

export function buildCommonsFilePageUrl(fileTitle: string): string {
  const underscored = fileTitle.trim().replace(/\s+/g, '_');
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(underscored)}`;
}
