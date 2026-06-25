import {
  GROCERY_CATALOG,
  type GroceryCategory,
  type GroceryItem,
} from '@/src/data/groceryCatalog';
import { mapToSpendingCategory } from '@/src/theme/smartCart';

const byCanonical = new Map<string, GroceryItem>();
const byAlias = new Map<string, GroceryItem>();

for (const item of GROCERY_CATALOG) {
  byCanonical.set(item.canonicalName.toLowerCase(), item);
  byAlias.set(item.canonicalName.toLowerCase(), item);
  for (const alias of item.aliases ?? []) {
    byAlias.set(alias.toLowerCase(), item);
  }
}

function getCatalogItemByCanonical(canonicalName: string): GroceryItem | undefined {
  return byCanonical.get(canonicalName.trim().toLowerCase());
}

function getCatalogItemByName(name: string): GroceryItem | undefined {
  const key = name.trim().toLowerCase();
  return byAlias.get(key) ?? byCanonical.get(key);
}

const CATEGORY_EMOJIS: Record<GroceryCategory, string> = {
  Dairy: '🥛',
  Produce: '🥬',
  Meat: '🥩',
  Pantry: '🍞',
  Frozen: '🧊',
  Beverages: '🥤',
  Household: '🧴',
  Snacks: '🍿',
  Bakery: '🥐',
  Other: '📦',
};

/** Category icon for catalog grouping — not used for user-typed custom items. */
export function getEmojiForCategory(category?: string): string {
  if (!category?.trim()) return DEFAULT_ITEM_EMOJI;
  const key = category.trim() as GroceryCategory;
  if (key in CATEGORY_EMOJIS) return CATEGORY_EMOJIS[key];
  return SPENDING_CATEGORY_EMOJIS[category] ?? DEFAULT_ITEM_EMOJI;
}

/** Grocery cart icon for user-defined items and unknown-item fallback. */
export const CUSTOM_ITEM_EMOJI = '🛒';

/** Default when no catalog entry or keyword match exists. */
export const DEFAULT_ITEM_EMOJI = CUSTOM_ITEM_EMOJI;

export function getEmojiForUserDefinedItem(): string {
  return CUSTOM_ITEM_EMOJI;
}

export type ResolveItemEmojiOptions = {
  isUserDefined?: boolean;
};

const SPENDING_CATEGORY_EMOJIS: Record<string, string> = {
  Snacks: '🍿',
  Beverages: '🥤',
  Household: '🧴',
};

/** Checked before food keywords so pet food, diapers, and retail lines never get food emojis. */
const NON_FOOD_KEYWORD_EMOJIS: ReadonlyArray<{ pattern: RegExp; emoji: string }> = [
  { pattern: /^\(name\s+hidden\)$/i, emoji: '📋' },
  { pattern: /^\d{5,}\s+\S/i, emoji: DEFAULT_ITEM_EMOJI },
  { pattern: /\bcat\s+food\b|\bfeline\s+food\b|\bkitty\s+food\b/i, emoji: '🐱' },
  { pattern: /\bdog\s+food\b|\bcanine\s+food\b|\bpuppy\s+food\b/i, emoji: '🐶' },
  { pattern: /\bpet\s+food\b/i, emoji: '🐾' },
  { pattern: /\bdiapers?\b|\bbaby\s+wipes\b|\bbaby\s+formula\b/i, emoji: '👶' },
  { pattern: /\bbroom(s)?\b|\bmop(s)?\b|\bdust\s+pan(s)?\b/i, emoji: '🧹' },
  { pattern: /\bsponge(s)?\b|\bscrub\s+brush(es)?\b/i, emoji: '🧽' },
  { pattern: /\bcleaning\s+items?\b|\bclean(er|ing)\s+supplies?\b/i, emoji: '🧴' },
  { pattern: /\bfloor\s+lamp(s)?\b|\btable\s+lamp(s)?\b|\bdesk\s+lamp(s)?\b/i, emoji: '💡' },
  { pattern: /\blamp(s)?\b/i, emoji: '💡' },
  { pattern: /\bthread\b|\bsewing\b|\bembroidery\b|\byarn\b/i, emoji: '🧵' },
  { pattern: /\bthreshold\b/i, emoji: '🏠' },
  { pattern: /\ba\s+new\s+day\b/i, emoji: '👕' },
  { pattern: /\btrash\s+bags?\b|\bgarbage\s+bags?\b/i, emoji: '🗑️' },
  { pattern: /\bpaper\s+towels?\b|\btoilet\s+paper\b|\bbath\s+tissue\b/i, emoji: '🧻' },
  { pattern: /\blaundry\s+detergent\b|\bfabric\s+softener\b|\bdryer\s+sheets?\b/i, emoji: '🧺' },
  { pattern: /\bdish\s+soap\b|\bdishwasher\s+detergent\b|\ball[\s-]*purpose\s+clean/i, emoji: '🧴' },
  { pattern: /\bshampoo\b|\bconditioner\b|\btoothpaste\b|\bdeodorant\b/i, emoji: '🧴' },
  { pattern: /\bbatter(y|ies)\b|\blight\s+bulb(s)?\b/i, emoji: '🔋' },
  { pattern: /\bmedicine\b|\bvitamin(s)?\b|\bsupplement(s)?\b|\bpharmacy\b/i, emoji: '💊' },
];

/** Longer / more specific patterns first. */
const FOOD_KEYWORD_EMOJIS: ReadonlyArray<{ pattern: RegExp; emoji: string }> = [
  { pattern: /\blactose[\s-]*free\b.*\bmilk\b|\bmilk\b.*\blactose[\s-]*free\b/i, emoji: '🥛' },
  { pattern: /\b(almond|oat|soy|coconut|cashew|rice)\s+milk\b/i, emoji: '🥛' },
  { pattern: /\b(whole|skim|2%|1%|low[\s-]*fat)\s+milk\b/i, emoji: '🥛' },
  { pattern: /\bchicken\s+(breast|thigh|wing|tender|nugget)\b/i, emoji: '🍗' },
  { pattern: /\bground\s+(beef|turkey|pork|meat)\b/i, emoji: '🥩' },
  { pattern: /\b(pepperoni|cheese)\s+pizza\b/i, emoji: '🍕' },
  { pattern: /\bice\s+cream\b/i, emoji: '🍦' },
  { pattern: /\bfrozen\s+pizza\b/i, emoji: '🍕' },
  { pattern: /\bpeanut\s+butter\b/i, emoji: '🥜' },
  { pattern: /\bcream\s+cheese\b/i, emoji: '🧀' },
  { pattern: /\bsour\s+cream\b/i, emoji: '🥄' },
  { pattern: /\bcottage\s+cheese\b/i, emoji: '🥣' },
  { pattern: /\bheavy\s+(whipping\s+)?cream\b/i, emoji: '🥛' },
  { pattern: /\bgreek\s+yogurt\b/i, emoji: '🥣' },
  { pattern: /\bhot\s+dogs?\b|\bfrankfurters?\b/i, emoji: '🌭' },
  { pattern: /\b(tomato|marinara|pasta)\s+sauce\b/i, emoji: '🍅' },
  { pattern: /\bchicken\s+(broth|stock)\b/i, emoji: '🍲' },
  { pattern: /\b(bell|red|green|yellow)\s+peppers?\b/i, emoji: '🫑' },
  { pattern: /\bsalmon\b|\btuna\b|\bshrimp\b|\bcod\b|\bfish\b/i, emoji: '🐟' },
  { pattern: /\bbacon\b/i, emoji: '🥓' },
  { pattern: /\bsausage\b/i, emoji: '🌭' },
  { pattern: /\bstrawberr(y|ies)\b/i, emoji: '🍓' },
  { pattern: /\bblueberr(y|ies)\b|\braspberr(y|ies)\b|\bblackberr(y|ies)\b/i, emoji: '🫐' },
  { pattern: /\bwatermelon\b/i, emoji: '🍉' },
  { pattern: /\bpineapple\b/i, emoji: '🍍' },
  { pattern: /\bmango\b/i, emoji: '🥭' },
  { pattern: /\bpeach(es)?\b/i, emoji: '🍑' },
  { pattern: /\bpear(s)?\b/i, emoji: '🍐' },
  { pattern: /\bcherr(y|ies)\b/i, emoji: '🍒' },
  { pattern: /\bkiwi\b/i, emoji: '🥝' },
  { pattern: /\bcucumber\b/i, emoji: '🥒' },
  { pattern: /\bbroccoli\b|\bcauliflower\b/i, emoji: '🥦' },
  { pattern: /\bcorn\b/i, emoji: '🌽' },
  { pattern: /\bmushroom(s)?\b/i, emoji: '🍄' },
  { pattern: /\bgarlic\b/i, emoji: '🧄' },
  { pattern: /\bginger\b/i, emoji: '🫚' },
  { pattern: /\blemon(s)?\b|\blime(s)?\b/i, emoji: '🍋' },
  { pattern: /\bgrape(s)?\b/i, emoji: '🍇' },
  { pattern: /\bavocado(s)?\b/i, emoji: '🥑' },
  { pattern: /\bcarrot(s)?\b/i, emoji: '🥕' },
  { pattern: /\bpotato(es)?\b/i, emoji: '🥔' },
  { pattern: /\bonion(s)?\b/i, emoji: '🧅' },
  { pattern: /\btomato(es)?\b/i, emoji: '🍅' },
  { pattern: /\blettuce\b|\bspinach\b|\bkale\b|\bsalad\b/i, emoji: '🥬' },
  { pattern: /\bbanana(s)?\b/i, emoji: '🍌' },
  { pattern: /\bapple(s)?\b/i, emoji: '🍎' },
  { pattern: /\borange(s)?\b|\bclementine(s)?\b/i, emoji: '🍊' },
  { pattern: /\bmilk\b/i, emoji: '🥛' },
  { pattern: /\begg(s)?\b/i, emoji: '🥚' },
  { pattern: /\bbutter\b/i, emoji: '🧈' },
  { pattern: /\byogurt\b/i, emoji: '🥣' },
  { pattern: /\bcheese\b/i, emoji: '🧀' },
  { pattern: /\bbread\b|\bbagel(s)?\b|\bbun(s)?\b|\broll(s)?\b/i, emoji: '🍞' },
  { pattern: /\bcroissant(s)?\b|\bmuffin(s)?\b|\bdonut(s)?\b|\bdoughnut(s)?\b/i, emoji: '🥐' },
  { pattern: /\bchicken\b|\bpoultry\b/i, emoji: '🍗' },
  { pattern: /\bham\b/i, emoji: '🍖' },
  { pattern: /\bbeef\b|\bsteak\b|\bpork\b|\blamb\b|\bmeat\b/i, emoji: '🥩' },
  { pattern: /\bturkey\b/i, emoji: '🦃' },
  { pattern: /\bsalmon\b|\bfillet\b|\bribeye\b|\bchop(s)?\b|\bwing(s)?\b|\bdrumstick(s)?\b/i, emoji: '🥩' },
  { pattern: /\bsnack(s)?\b|\bproduce\b/i, emoji: '🥬' },
  { pattern: /\bcerea(l)?\b/i, emoji: '🥣' },
  { pattern: /\brice\b/i, emoji: '🍚' },
  { pattern: /\bpasta\b|\bspaghetti\b|\bmacaroni\b|\bpenne\b/i, emoji: '🍝' },
  { pattern: /\bcereal\b|\boatmeal\b|\boats\b/i, emoji: '🥣' },
  { pattern: /\bflour\b/i, emoji: '🌾' },
  { pattern: /\bsugar\b|\bsalt\b|\bspice(s)?\b/i, emoji: '🧂' },
  { pattern: /\boil\b|\bolive\b|\bcanola\b/i, emoji: '🫒' },
  { pattern: /\bbean(s)?\b|\blentil(s)?\b|\bchickpea(s)?\b/i, emoji: '🫘' },
  { pattern: /\bsoup\b|\bbroth\b|\bstock\b/i, emoji: '🍲' },
  { pattern: /\bcan(ned)?\b|\bjar\b/i, emoji: '🥫' },
  { pattern: /\bchip(s)?\b|\bcracker(s)?\b|\bpretzel(s)?\b/i, emoji: '🍿' },
  { pattern: /\bcookie(s)?\b|\bbrownie(s)?\b|\bcake\b/i, emoji: '🍪' },
  { pattern: /\bcandy\b|\bchocolate\b|\bgumm(y|ies)\b/i, emoji: '🍫' },
  { pattern: /\bsoda\b|\bcola\b|\bpepsi\b|\bcoke\b/i, emoji: '🥤' },
  { pattern: /\bjuice\b|\blemonade\b/i, emoji: '🧃' },
  { pattern: /\bwater\b|\bspring\s+water\b/i, emoji: '💧' },
  { pattern: /\bcoffee\b|\bespresso\b|\blatte\b/i, emoji: '☕' },
  { pattern: /\btea\b|\bmatcha\b/i, emoji: '🍵' },
  { pattern: /\bbeer\b|\bwine\b|\bliquor\b/i, emoji: '🍷' },
  { pattern: /\bpizza\b/i, emoji: '🍕' },
  { pattern: /\bburger(s)?\b|\bhamburger(s)?\b/i, emoji: '🍔' },
  { pattern: /\btaco(s)?\b|\bburrito(s)?\b|\btortilla(s)?\b/i, emoji: '🌮' },
  { pattern: /\bsandwich(es)?\b|\bwrap(s)?\b/i, emoji: '🥪' },
  { pattern: /\bhoney\b|\bjam\b|\bjelly\b|\bsyrup\b/i, emoji: '🍯' },
  { pattern: /\bnut(s)?\b|\balmond(s)?\b|\bwalnut(s)?\b|\bpecan(s)?\b/i, emoji: '🥜' },
  { pattern: /\bproduce\b|\bfruit\b|\bvegetable(s)?\b|\bveggie(s)?\b/i, emoji: '🥬' },
  { pattern: /\bdeli\b|\blunch\s+meat\b/i, emoji: '🥩' },
  { pattern: /\bfrozen\b/i, emoji: '🧊' },
  { pattern: /\bbakery\b|\bbaked\b/i, emoji: '🥐' },
  { pattern: /\borganic\b|\bfresh\b|\bgrocery\b/i, emoji: '🍽️' },
];

const NON_FOOD_PATTERN =
  /\b(paper|tissue|towel|soap|detergent|cleaner|bleach|trash|garbage|laundry|dish\s+soap|shampoo|conditioner|toothpaste|deodorant|diapers?|battery|batteries|light\s+bulb|pet\s+food|dog\s+food|cat\s+food|office|supply|hardware|medicine|vitamin|supplement|pharmacy|cleaning|lamp|thread|fabric|sewing|diaper|wipes)\b/i;

export function isRetailSkuLine(name: string): boolean {
  return /^\d{5,}\s+\S/.test(name.trim());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termPattern(term: string): RegExp {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return /(?!)/;
  if (normalized.includes(' ')) {
    return new RegExp(normalized.replace(/\s+/g, '\\s+'), 'i');
  }
  return new RegExp(`\\b${escapeRegExp(normalized)}\\b`, 'i');
}

function findCatalogMatchBySubstring(name: string): GroceryItem | undefined {
  const lower = name.trim().toLowerCase();
  if (!lower) return undefined;

  let best: { item: GroceryItem; score: number } | undefined;

  for (const item of GROCERY_CATALOG) {
    const terms = [item.canonicalName, ...(item.aliases ?? [])];
    for (const term of terms) {
      const trimmed = term.trim().toLowerCase();
      if (trimmed.length < 3) continue;
      if (!termPattern(trimmed).test(lower)) continue;

      const score = trimmed.length;
      if (!best || score > best.score) {
        best = { item, score };
      }
    }
  }

  return best?.item;
}

function matchFoodKeyword(name: string): string | undefined {
  for (const { pattern, emoji } of FOOD_KEYWORD_EMOJIS) {
    if (pattern.test(name)) return emoji;
  }
  return undefined;
}

function matchNonFoodKeyword(name: string): string | undefined {
  for (const { pattern, emoji } of NON_FOOD_KEYWORD_EMOJIS) {
    if (pattern.test(name)) return emoji;
  }
  return undefined;
}

function isLikelyNonFoodItem(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '(name hidden)') return true;
  if (isRetailSkuLine(trimmed)) return true;
  if (matchNonFoodKeyword(trimmed)) return true;
  if (NON_FOOD_PATTERN.test(trimmed)) return true;
  return mapToSpendingCategory(trimmed) === 'Household';
}

function isLikelyFoodItem(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || isLikelyNonFoodItem(trimmed)) return false;
  if (matchFoodKeyword(trimmed)) return true;
  if (findCatalogMatchBySubstring(trimmed)) return true;
  if (getCatalogItemByName(trimmed)) return true;
  const spendingCategory = mapToSpendingCategory(trimmed);
  return spendingCategory === 'Snacks' || spendingCategory === 'Beverages';
}

/** Common abbreviated receipt line names that should still sync to pantry. */
const RECEIPT_GROCERY_LINE_RE =
  /\b(milk|egg|steak|ribeye|chop|wing|salmon|fillet|pork|chicken|beef|cereal|cerea|produce|snack|frozen|bread|diapers?|food|meat|fruit|vegetable|cheese|yogurt|butter|rice|pasta|soda|juice|water|coffee|tea|chip|cracker|soap|paper|towel)\b/i;

/** Pantry should track groceries, not Target SKU home goods or OCR placeholders. */
export function isPantryEligibleItem(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '(name hidden)') return false;
  if (isRetailSkuLine(trimmed)) return false;
  if (/\b(floor\s+lamp|threshold|uni\s+thread|a\s+new\s+day)\b/i.test(trimmed)) return false;
  if (RECEIPT_GROCERY_LINE_RE.test(trimmed)) return true;
  if (isLikelyNonFoodItem(trimmed)) {
    return /\b(cat|dog|pet)\s+food\b/i.test(trimmed);
  }
  return (
    isLikelyFoodItem(trimmed) ||
    !!findCatalogMatchBySubstring(trimmed) ||
    !!getCatalogItemByName(trimmed)
  );
}

export function resolveItemEmoji(
  canonicalName?: string,
  itemName?: string,
  options?: ResolveItemEmojiOptions
): string {
  if (options?.isUserDefined) return CUSTOM_ITEM_EMOJI;

  if (canonicalName) {
    const canonicalMatch = getCatalogItemByCanonical(canonicalName);
    if (canonicalMatch) return canonicalMatch.emoji;
  }

  const names = [itemName, canonicalName].filter((value): value is string => Boolean(value?.trim()));
  for (const name of names) {
    const exactMatch = getCatalogItemByName(name);
    if (exactMatch) return exactMatch.emoji;
  }

  for (const name of names) {
    const nonFoodMatch = matchNonFoodKeyword(name);
    if (nonFoodMatch) return nonFoodMatch;
  }

  for (const name of names) {
    const substringMatch = findCatalogMatchBySubstring(name);
    if (substringMatch) return substringMatch.emoji;
  }

  for (const name of names) {
    const keywordMatch = matchFoodKeyword(name);
    if (keywordMatch) return keywordMatch;
  }

  for (const name of names) {
    const catalogMatch = findCatalogMatchBySubstring(name);
    if (catalogMatch) return CATEGORY_EMOJIS[catalogMatch.category];
  }

  const primaryName = itemName?.trim() || canonicalName?.trim() || '';
  if (primaryName) {
    if (isLikelyNonFoodItem(primaryName)) {
      return matchNonFoodKeyword(primaryName) ?? DEFAULT_ITEM_EMOJI;
    }

    const spendingCategory = mapToSpendingCategory(primaryName);
    const spendingEmoji = SPENDING_CATEGORY_EMOJIS[spendingCategory];
    if (spendingEmoji) return spendingEmoji;
    if (isLikelyFoodItem(primaryName)) return '🍽️';
  }

  return DEFAULT_ITEM_EMOJI;
}
