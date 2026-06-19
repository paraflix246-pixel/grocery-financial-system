import { STARTER_LIST_ITEMS } from '@/src/data/starterListItems';

export type CommonGroceryItem = {
  canonicalName: string;
  category: string;
  expectedPrice: number;
  quantityLabel: string;
  aliases: string[];
  emoji: string;
};

const EMOJI_BY_KEY: Record<string, string> = {
  milk: '🥛',
  eggs: '🥚',
  cheese: '🧀',
  banana: '🍌',
  apple: '🍎',
  bread: '🍞',
  rice: '🍚',
  pasta: '🍝',
  paper: '🧻',
  dish: '🧴',
  chips: '🥔',
  crackers: '🍘',
  water: '💧',
  juice: '🧃',
};

function emojiForName(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_BY_KEY)) {
    if (lower.includes(key)) return emoji;
  }
  return '🛒';
}

const EXTRA_ALIASES: Record<string, string[]> = {
  Milk: ['whole milk', '2% milk', 'skim milk', 'milk gallon', 'organic milk', '1 gal milk'],
  Eggs: ['large eggs', 'dozen eggs', 'egg carton', 'grade a eggs'],
  Bread: ['white bread', 'wheat bread', 'whole wheat bread', 'sandwich bread'],
  Bananas: ['banana bunch', 'organic bananas'],
  Apples: ['gala apples', 'honeycrisp apples', 'apple bag'],
  'Cheddar Cheese': ['cheddar', 'sharp cheddar', 'shredded cheddar'],
  Rice: ['white rice', 'jasmine rice', 'basmati rice'],
  Pasta: ['spaghetti', 'penne', 'macaroni'],
  'Paper Towels': ['paper towel', 'bounty paper towels'],
  'Dish Soap': ['dawn dish soap', 'dish detergent'],
  Chips: ['potato chips', 'tortilla chips', 'lays chips'],
  Crackers: ['ritz crackers', 'saltine crackers'],
  Water: ['bottled water', 'spring water', 'purified water'],
  Juice: ['orange juice', 'apple juice', 'oj'],
};

export const COMMON_GROCERY_ITEMS: CommonGroceryItem[] = STARTER_LIST_ITEMS.map((item) => ({
  canonicalName: item.name,
  category: item.category,
  expectedPrice: item.expectedPrice,
  quantityLabel: item.quantityLabel,
  aliases: EXTRA_ALIASES[item.name] ?? [],
  emoji: emojiForName(item.name),
}));

export const POPULAR_ALERT_ITEMS = ['Milk', 'Eggs', 'Bread', 'Bananas', 'Rice', 'Water'];

export function getCatalogItem(canonicalName: string): CommonGroceryItem | undefined {
  const key = canonicalName.trim().toLowerCase();
  return COMMON_GROCERY_ITEMS.find((item) => item.canonicalName.toLowerCase() === key);
}

export function getCatalogCanonicalNames(): string[] {
  return COMMON_GROCERY_ITEMS.map((item) => item.canonicalName);
}
