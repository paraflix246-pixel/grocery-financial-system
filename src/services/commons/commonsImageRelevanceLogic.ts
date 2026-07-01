import { normalizeCommonsFoodTerm } from '@/src/services/commons/commonsImageLogic';

export const COMMONS_RELEVANCE_SCORE_THRESHOLD = 40;

type RelevanceRuleSet = {
  rejectKeywords: readonly string[];
  preferKeywords: readonly string[];
};

const DEFAULT_RULES: RelevanceRuleSet = {
  rejectKeywords: ['logo', 'icon', 'svg', 'map', 'diagram', 'chart', 'stamp', 'poster'],
  preferKeywords: [],
};

const FOOD_RELEVANCE_RULES: Record<string, RelevanceRuleSet> = {
  bread: {
    rejectKeywords: [
      'croissant',
      'pastry',
      'kifli',
      'bagel',
      'bun',
      'donut',
      'doughnut',
      'cake',
      'brioche',
      'muffin',
      'pretzel',
      'scone',
      'roll',
      'toast',
    ],
    preferKeywords: ['loaf', 'bread', 'sliced', 'white bread', 'whole wheat', 'sourdough', 'baking'],
  },
  milk: {
    rejectKeywords: ['chocolate', 'shake', 'spill', 'cartoon', 'logo', 'breast'],
    preferKeywords: ['milk', 'glass', 'bottle', 'dairy', 'cow'],
  },
  eggs: {
    rejectKeywords: ['easter', 'nest', 'omelette', 'omelet', 'fried', 'scrambled', 'cartoon'],
    preferKeywords: ['egg', 'eggs', 'chicken', 'carton', 'dozen'],
  },
  bananas: {
    rejectKeywords: ['plantain', 'peel only', 'logo', 'minion'],
    preferKeywords: ['banana', 'bananas', 'bunch'],
  },
  rice: {
    rejectKeywords: ['field', 'paddy', 'plant', 'bag logo', 'map'],
    preferKeywords: ['rice', 'cooked', 'bowl', 'white rice', 'steamed'],
  },
  water: {
    rejectKeywords: ['flood', 'ocean', 'river', 'lake', 'logo', 'label'],
    preferKeywords: ['water', 'bottle', 'glass', 'drinking'],
  },
  'chicken breast': {
    rejectKeywords: ['cooked', 'grilled', 'fried', 'roasted', 'nugget', 'wing', 'cartoon'],
    preferKeywords: ['chicken', 'breast', 'raw', 'fillet', 'boneless'],
  },
  'ground beef': {
    rejectKeywords: ['cooked', 'burger', 'patty', 'meatball', 'taco', 'logo'],
    preferKeywords: ['ground', 'beef', 'minced', 'meat', 'raw'],
  },
  butter: {
    rejectKeywords: ['peanut', 'almond', 'logo', 'margarine', 'croissant', 'koláč', 'kolac', 'pastry', 'bread', 'naan', 'sandwich'],
    preferKeywords: ['butter', 'block', 'stick', 'dairy', 'mound'],
  },
  coffee: {
    rejectKeywords: ['plant', 'bean field', 'logo', 'starbucks', 'cartoon'],
    preferKeywords: ['coffee', 'cup', 'espresso', 'latte', 'beans'],
  },
  'paper towels': {
    rejectKeywords: ['toilet', 'tissue box logo', 'advertisement'],
    preferKeywords: ['paper towel', 'paper towels', 'roll'],
  },
  'cheddar cheese': {
    rejectKeywords: ['macaroni', 'burger', 'logo', 'cartoon'],
    preferKeywords: ['cheddar', 'cheese', 'block', 'slice'],
  },
};

const TERM_TO_RULE_KEY: Record<string, string> = {
  'whole milk': 'milk',
  'white bread': 'bread',
  'white rice': 'rice',
  'minced meat': 'ground beef',
  'hamburger meat': 'ground beef',
  'paper towel': 'paper towels',
  cheddar: 'cheddar cheese',
};

function normalizeTitleForMatch(title: string): string {
  return title
    .replace(/^file:/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\.(jpg|jpeg|png|webp|gif)$/i, '')
    .toLowerCase()
    .trim();
}

export function resolveRelevanceRuleKey(normalizedTerm: string): string {
  return TERM_TO_RULE_KEY[normalizedTerm] ?? normalizedTerm;
}

export function getRelevanceRules(normalizedTerm: string): RelevanceRuleSet {
  const ruleKey = resolveRelevanceRuleKey(normalizedTerm);
  const specific = FOOD_RELEVANCE_RULES[ruleKey];
  if (!specific) return DEFAULT_RULES;
  return {
    rejectKeywords: [...DEFAULT_RULES.rejectKeywords, ...specific.rejectKeywords],
    preferKeywords: specific.preferKeywords,
  };
}

export function isRejectedCommonsTitle(title: string, normalizedTerm: string): boolean {
  const normalizedTitle = normalizeTitleForMatch(title);
  const rules = getRelevanceRules(normalizedTerm);
  return rules.rejectKeywords.some((keyword) => normalizedTitle.includes(keyword));
}

export function scoreCommonsImageTitle(title: string, normalizedTerm: string): number {
  const normalizedTitle = normalizeTitleForMatch(title);
  if (!normalizedTitle) return 0;
  if (isRejectedCommonsTitle(title, normalizedTerm)) return -1;

  const rules = getRelevanceRules(normalizedTerm);
  const ruleKey = resolveRelevanceRuleKey(normalizedTerm);
  let score = 0;

  if (normalizedTitle.includes(ruleKey)) score += 45;
  if (normalizedTitle.includes(normalizedTerm)) score += 40;

  for (const word of normalizedTerm.split(/\s+/)) {
    if (word.length >= 3 && normalizedTitle.includes(word)) score += 18;
  }

  for (const keyword of rules.preferKeywords) {
    if (normalizedTitle.includes(keyword)) score += 12;
  }

  if (normalizedTitle.endsWith(' food') || normalizedTitle.includes(' food ')) score += 5;

  return score;
}

export function meetsCommonsRelevanceThreshold(score: number): boolean {
  return score >= COMMONS_RELEVANCE_SCORE_THRESHOLD;
}

/** Resolve a food search term to a Wikipedia page title. */
export function toWikipediaPageTitle(term: string): string {
  const normalized = normalizeCommonsFoodTerm(term);
  if (!normalized) return '';

  const wikiTitles: Record<string, string> = {
    bread: 'Bread',
    milk: 'Milk',
    eggs: 'Egg as food',
    bananas: 'Banana',
    rice: 'Rice',
    water: 'Drinking water',
    'chicken breast': 'Chicken as food',
    'ground beef': 'Ground beef',
    butter: 'Butter',
    coffee: 'Coffee',
    'paper towels': 'Paper towel',
    'cheddar cheese': 'Cheddar cheese',
  };

  return (
    wikiTitles[normalized] ??
    normalized
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('_')
  );
}
