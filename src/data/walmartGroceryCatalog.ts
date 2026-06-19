export type WalmartGroceryCategory =
  | 'Dairy'
  | 'Produce'
  | 'Meat'
  | 'Pantry'
  | 'Frozen'
  | 'Beverages'
  | 'Household'
  | 'Snacks'
  | 'Bakery';

export type WalmartGroceryItem = {
  id: string;
  name: string;
  canonicalName: string;
  category: WalmartGroceryCategory;
  emoji: string;
  typicalPriceRange?: [number, number];
  unit?: string;
  aliases?: string[];
};

/** Curated common Walmart grocery items — not an official Walmart API catalog. */
export const WALMART_CATALOG_LABEL = 'Common Walmart items';

export const WALMART_CATEGORIES: WalmartGroceryCategory[] = [
  'Dairy',
  'Produce',
  'Meat',
  'Pantry',
  'Frozen',
  'Beverages',
  'Household',
  'Snacks',
  'Bakery',
];

export const WALMART_GROCERY_CATALOG: WalmartGroceryItem[] = [
  // Dairy
  { id: 'wm-milk', name: 'Milk', canonicalName: 'Milk', category: 'Dairy', emoji: '🥛', typicalPriceRange: [3.49, 4.99], unit: '1 gallon', aliases: ['whole milk', '2% milk', 'skim milk', 'great value milk'] },
  { id: 'wm-eggs', name: 'Eggs', canonicalName: 'Eggs', category: 'Dairy', emoji: '🥚', typicalPriceRange: [2.99, 4.49], unit: '1 dozen', aliases: ['large eggs', 'dozen eggs', 'grade a eggs'] },
  { id: 'wm-butter', name: 'Butter', canonicalName: 'Butter', category: 'Dairy', emoji: '🧈', typicalPriceRange: [3.49, 5.49], unit: '1 lb', aliases: ['salted butter', 'unsalted butter'] },
  { id: 'wm-yogurt', name: 'Yogurt', canonicalName: 'Yogurt', category: 'Dairy', emoji: '🥣', typicalPriceRange: [0.59, 1.29], unit: '1 cup', aliases: ['greek yogurt', 'plain yogurt', 'yoplait'] },
  { id: 'wm-cheddar', name: 'Cheddar Cheese', canonicalName: 'Cheddar Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [2.99, 5.99], unit: '8 oz', aliases: ['cheddar', 'sharp cheddar', 'block cheddar'] },
  { id: 'wm-shredded-cheese', name: 'Shredded Cheese', canonicalName: 'Shredded Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [2.49, 4.49], unit: '8 oz bag', aliases: ['shredded cheddar', 'mexican blend cheese'] },
  { id: 'wm-cream-cheese', name: 'Cream Cheese', canonicalName: 'Cream Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [1.99, 3.49], unit: '8 oz', aliases: ['philadelphia cream cheese'] },
  { id: 'wm-sour-cream', name: 'Sour Cream', canonicalName: 'Sour Cream', category: 'Dairy', emoji: '🥄', typicalPriceRange: [1.79, 2.99], unit: '16 oz', aliases: ['daisy sour cream'] },
  { id: 'wm-cottage-cheese', name: 'Cottage Cheese', canonicalName: 'Cottage Cheese', category: 'Dairy', emoji: '🥣', typicalPriceRange: [2.49, 4.29], unit: '16 oz', aliases: ['low fat cottage cheese'] },
  { id: 'wm-heavy-cream', name: 'Heavy Cream', canonicalName: 'Heavy Cream', category: 'Dairy', emoji: '🥛', typicalPriceRange: [2.99, 4.49], unit: '1 pint', aliases: ['whipping cream', 'heavy whipping cream'] },

  // Produce
  { id: 'wm-bananas', name: 'Bananas', canonicalName: 'Bananas', category: 'Produce', emoji: '🍌', typicalPriceRange: [0.49, 0.69], unit: 'per lb', aliases: ['banana bunch', 'organic bananas'] },
  { id: 'wm-apples', name: 'Apples', canonicalName: 'Apples', category: 'Produce', emoji: '🍎', typicalPriceRange: [3.99, 6.99], unit: '3 lb bag', aliases: ['gala apples', 'honeycrisp apples', 'fuji apples'] },
  { id: 'wm-oranges', name: 'Oranges', canonicalName: 'Oranges', category: 'Produce', emoji: '🍊', typicalPriceRange: [4.99, 7.99], unit: '4 lb bag', aliases: ['navel oranges', 'clementines'] },
  { id: 'wm-strawberries', name: 'Strawberries', canonicalName: 'Strawberries', category: 'Produce', emoji: '🍓', typicalPriceRange: [2.99, 5.99], unit: '1 lb', aliases: ['fresh strawberries'] },
  { id: 'wm-grapes', name: 'Grapes', canonicalName: 'Grapes', category: 'Produce', emoji: '🍇', typicalPriceRange: [2.49, 4.99], unit: 'per lb', aliases: ['red grapes', 'green grapes'] },
  { id: 'wm-tomatoes', name: 'Tomatoes', canonicalName: 'Tomatoes', category: 'Produce', emoji: '🍅', typicalPriceRange: [1.99, 3.99], unit: 'per lb', aliases: ['roma tomatoes', 'cherry tomatoes'] },
  { id: 'wm-lettuce', name: 'Lettuce', canonicalName: 'Lettuce', category: 'Produce', emoji: '🥬', typicalPriceRange: [1.99, 3.49], unit: '1 head', aliases: ['romaine lettuce', 'iceberg lettuce', 'salad mix'] },
  { id: 'wm-onions', name: 'Onions', canonicalName: 'Onions', category: 'Produce', emoji: '🧅', typicalPriceRange: [1.29, 2.49], unit: '3 lb bag', aliases: ['yellow onions', 'sweet onions'] },
  { id: 'wm-potatoes', name: 'Potatoes', canonicalName: 'Potatoes', category: 'Produce', emoji: '🥔', typicalPriceRange: [3.99, 6.99], unit: '5 lb bag', aliases: ['russet potatoes', 'gold potatoes'] },
  { id: 'wm-carrots', name: 'Carrots', canonicalName: 'Carrots', category: 'Produce', emoji: '🥕', typicalPriceRange: [1.49, 2.99], unit: '1 lb bag', aliases: ['baby carrots', 'whole carrots'] },
  { id: 'wm-avocados', name: 'Avocados', canonicalName: 'Avocados', category: 'Produce', emoji: '🥑', typicalPriceRange: [0.88, 1.49], unit: 'each', aliases: ['hass avocado'] },
  { id: 'wm-bell-peppers', name: 'Bell Peppers', canonicalName: 'Bell Peppers', category: 'Produce', emoji: '🫑', typicalPriceRange: [1.49, 2.99], unit: 'each', aliases: ['red bell pepper', 'green pepper'] },

  // Meat
  { id: 'wm-chicken-breast', name: 'Chicken Breast', canonicalName: 'Chicken Breast', category: 'Meat', emoji: '🍗', typicalPriceRange: [2.99, 5.99], unit: 'per lb', aliases: ['boneless chicken breast', 'chicken cutlets'] },
  { id: 'wm-ground-beef', name: 'Ground Beef', canonicalName: 'Ground Beef', category: 'Meat', emoji: '🥩', typicalPriceRange: [4.99, 8.99], unit: 'per lb', aliases: ['80/20 ground beef', 'lean ground beef'] },
  { id: 'wm-pork-chops', name: 'Pork Chops', canonicalName: 'Pork Chops', category: 'Meat', emoji: '🥩', typicalPriceRange: [3.49, 6.99], unit: 'per lb', aliases: ['bone-in pork chops'] },
  { id: 'wm-bacon', name: 'Bacon', canonicalName: 'Bacon', category: 'Meat', emoji: '🥓', typicalPriceRange: [4.99, 7.99], unit: '12 oz', aliases: ['thick cut bacon', 'turkey bacon'] },
  { id: 'wm-sausage', name: 'Sausage', canonicalName: 'Sausage', category: 'Meat', emoji: '🌭', typicalPriceRange: [2.99, 5.49], unit: '1 lb', aliases: ['breakfast sausage', 'italian sausage'] },
  { id: 'wm-deli-turkey', name: 'Deli Turkey', canonicalName: 'Deli Turkey', category: 'Meat', emoji: '🦃', typicalPriceRange: [3.99, 6.99], unit: 'per lb', aliases: ['sliced turkey', 'oven roasted turkey'] },
  { id: 'wm-salmon', name: 'Salmon Fillets', canonicalName: 'Salmon Fillets', category: 'Meat', emoji: '🐟', typicalPriceRange: [7.99, 12.99], unit: 'per lb', aliases: ['atlantic salmon', 'salmon fillet'] },
  { id: 'wm-hot-dogs', name: 'Hot Dogs', canonicalName: 'Hot Dogs', category: 'Meat', emoji: '🌭', typicalPriceRange: [1.99, 4.49], unit: '8 pack', aliases: ['frankfurters', 'beef hot dogs'] },

  // Pantry
  { id: 'wm-bread', name: 'Bread', canonicalName: 'Bread', category: 'Pantry', emoji: '🍞', typicalPriceRange: [1.99, 3.49], unit: '1 loaf', aliases: ['white bread', 'wheat bread', 'sandwich bread'] },
  { id: 'wm-rice', name: 'Rice', canonicalName: 'Rice', category: 'Pantry', emoji: '🍚', typicalPriceRange: [2.99, 5.49], unit: '2 lb bag', aliases: ['white rice', 'jasmine rice', 'basmati rice'] },
  { id: 'wm-pasta', name: 'Pasta', canonicalName: 'Pasta', category: 'Pantry', emoji: '🍝', typicalPriceRange: [1.19, 2.49], unit: '1 box', aliases: ['spaghetti', 'penne', 'macaroni'] },
  { id: 'wm-flour', name: 'Flour', canonicalName: 'Flour', category: 'Pantry', emoji: '🌾', typicalPriceRange: [2.49, 4.99], unit: '5 lb bag', aliases: ['all purpose flour', 'self rising flour'] },
  { id: 'wm-sugar', name: 'Sugar', canonicalName: 'Sugar', category: 'Pantry', emoji: '🧂', typicalPriceRange: [2.49, 4.49], unit: '4 lb bag', aliases: ['granulated sugar', 'brown sugar'] },
  { id: 'wm-cooking-oil', name: 'Cooking Oil', canonicalName: 'Cooking Oil', category: 'Pantry', emoji: '🫒', typicalPriceRange: [3.99, 7.99], unit: '48 oz', aliases: ['vegetable oil', 'canola oil', 'olive oil'] },
  { id: 'wm-canned-beans', name: 'Canned Beans', canonicalName: 'Canned Beans', category: 'Pantry', emoji: '🫘', typicalPriceRange: [0.78, 1.29], unit: '15 oz can', aliases: ['black beans', 'pinto beans', 'kidney beans'] },
  { id: 'wm-peanut-butter', name: 'Peanut Butter', canonicalName: 'Peanut Butter', category: 'Pantry', emoji: '🥜', typicalPriceRange: [2.49, 4.99], unit: '16 oz jar', aliases: ['creamy peanut butter', 'jif peanut butter'] },
  { id: 'wm-cereal', name: 'Cereal', canonicalName: 'Cereal', category: 'Pantry', emoji: '🥣', typicalPriceRange: [3.49, 5.99], unit: '1 box', aliases: ['cheerios', 'frosted flakes', 'corn flakes'] },
  { id: 'wm-oatmeal', name: 'Oatmeal', canonicalName: 'Oatmeal', category: 'Pantry', emoji: '🥣', typicalPriceRange: [2.99, 4.99], unit: '42 oz', aliases: ['quick oats', 'instant oatmeal'] },
  { id: 'wm-tomato-sauce', name: 'Tomato Sauce', canonicalName: 'Tomato Sauce', category: 'Pantry', emoji: '🍅', typicalPriceRange: [0.98, 1.79], unit: '15 oz can', aliases: ['marinara sauce', 'pasta sauce'] },
  { id: 'wm-chicken-broth', name: 'Chicken Broth', canonicalName: 'Chicken Broth', category: 'Pantry', emoji: '🍲', typicalPriceRange: [1.49, 2.99], unit: '32 oz', aliases: ['chicken stock', 'bone broth'] },

  // Frozen
  { id: 'wm-frozen-pizza', name: 'Frozen Pizza', canonicalName: 'Frozen Pizza', category: 'Frozen', emoji: '🍕', typicalPriceRange: [4.99, 8.99], unit: '1 pizza', aliases: ['pepperoni pizza', 'digiorno pizza'] },
  { id: 'wm-ice-cream', name: 'Ice Cream', canonicalName: 'Ice Cream', category: 'Frozen', emoji: '🍦', typicalPriceRange: [3.99, 6.99], unit: '48 oz', aliases: ['vanilla ice cream', 'great value ice cream'] },
  { id: 'wm-frozen-vegetables', name: 'Frozen Vegetables', canonicalName: 'Frozen Vegetables', category: 'Frozen', emoji: '🥦', typicalPriceRange: [1.49, 2.99], unit: '12 oz bag', aliases: ['frozen broccoli', 'mixed vegetables', 'steamable veggies'] },
  { id: 'wm-frozen-fries', name: 'Frozen Fries', canonicalName: 'Frozen Fries', category: 'Frozen', emoji: '🍟', typicalPriceRange: [2.99, 4.99], unit: '32 oz bag', aliases: ['french fries', 'crinkle cut fries'] },
  { id: 'wm-frozen-waffles', name: 'Frozen Waffles', canonicalName: 'Frozen Waffles', category: 'Frozen', emoji: '🧇', typicalPriceRange: [2.49, 4.49], unit: '12 count', aliases: ['eggo waffles', 'homestyle waffles'] },
  { id: 'wm-frozen-berries', name: 'Frozen Berries', canonicalName: 'Frozen Berries', category: 'Frozen', emoji: '🫐', typicalPriceRange: [2.99, 5.49], unit: '16 oz bag', aliases: ['frozen blueberries', 'mixed berries'] },
  { id: 'wm-frozen-nuggets', name: 'Frozen Chicken Nuggets', canonicalName: 'Frozen Chicken Nuggets', category: 'Frozen', emoji: '🍗', typicalPriceRange: [4.99, 8.99], unit: '29 oz bag', aliases: ['chicken nuggets', 'dino nuggets'] },
  { id: 'wm-frozen-fish', name: 'Frozen Fish Sticks', canonicalName: 'Frozen Fish Sticks', category: 'Frozen', emoji: '🐟', typicalPriceRange: [3.99, 6.99], unit: '18 count', aliases: ['fish fillets', 'breaded fish'] },

  // Beverages
  { id: 'wm-water', name: 'Water', canonicalName: 'Water', category: 'Beverages', emoji: '💧', typicalPriceRange: [3.99, 6.99], unit: '24 pack', aliases: ['bottled water', 'spring water', 'purified water'] },
  { id: 'wm-juice', name: 'Juice', canonicalName: 'Juice', category: 'Beverages', emoji: '🧃', typicalPriceRange: [2.99, 4.99], unit: '64 oz', aliases: ['apple juice', 'cranberry juice'] },
  { id: 'wm-soda', name: 'Soda', canonicalName: 'Soda', category: 'Beverages', emoji: '🥤', typicalPriceRange: [4.99, 8.99], unit: '12 pack', aliases: ['cola', 'pepsi', 'coke', 'soft drink'] },
  { id: 'wm-coffee', name: 'Coffee', canonicalName: 'Coffee', category: 'Beverages', emoji: '☕', typicalPriceRange: [5.99, 12.99], unit: '12 oz bag', aliases: ['ground coffee', 'folgers coffee', 'maxwell house'] },
  { id: 'wm-tea', name: 'Tea', canonicalName: 'Tea', category: 'Beverages', emoji: '🍵', typicalPriceRange: [2.49, 5.99], unit: '20 bags', aliases: ['black tea', 'green tea', 'herbal tea'] },
  { id: 'wm-sports-drink', name: 'Sports Drink', canonicalName: 'Sports Drink', category: 'Beverages', emoji: '🥤', typicalPriceRange: [1.29, 2.49], unit: '32 oz', aliases: ['gatorade', 'powerade'] },
  { id: 'wm-almond-milk', name: 'Almond Milk', canonicalName: 'Almond Milk', category: 'Beverages', emoji: '🥛', typicalPriceRange: [2.49, 4.49], unit: '64 oz', aliases: ['unsweetened almond milk', 'vanilla almond milk'] },
  { id: 'wm-orange-juice', name: 'Orange Juice', canonicalName: 'Orange Juice', category: 'Beverages', emoji: '🍊', typicalPriceRange: [3.49, 5.99], unit: '52 oz', aliases: ['oj', 'no pulp orange juice'] },
  { id: 'wm-bottled-tea', name: 'Bottled Tea', canonicalName: 'Bottled Tea', category: 'Beverages', emoji: '🍵', typicalPriceRange: [1.49, 2.99], unit: '16 oz', aliases: ['sweet tea', 'arizona tea', 'iced tea'] },
  { id: 'wm-energy-drink', name: 'Energy Drink', canonicalName: 'Energy Drink', category: 'Beverages', emoji: '⚡', typicalPriceRange: [1.99, 3.49], unit: '16 oz', aliases: ['red bull', 'monster energy'] },

  // Household
  { id: 'wm-paper-towels', name: 'Paper Towels', canonicalName: 'Paper Towels', category: 'Household', emoji: '🧻', typicalPriceRange: [5.49, 9.99], unit: '6 roll pack', aliases: ['paper towel', 'bounty paper towels'] },
  { id: 'wm-toilet-paper', name: 'Toilet Paper', canonicalName: 'Toilet Paper', category: 'Household', emoji: '🧻', typicalPriceRange: [6.99, 12.99], unit: '12 roll pack', aliases: ['bath tissue', 'tp'] },
  { id: 'wm-dish-soap', name: 'Dish Soap', canonicalName: 'Dish Soap', category: 'Household', emoji: '🧴', typicalPriceRange: [2.49, 4.49], unit: '24 oz', aliases: ['dawn dish soap', 'dish detergent'] },
  { id: 'wm-laundry-detergent', name: 'Laundry Detergent', canonicalName: 'Laundry Detergent', category: 'Household', emoji: '🧺', typicalPriceRange: [8.99, 14.99], unit: '100 oz', aliases: ['tide detergent', 'liquid detergent'] },
  { id: 'wm-trash-bags', name: 'Trash Bags', canonicalName: 'Trash Bags', category: 'Household', emoji: '🗑️', typicalPriceRange: [4.99, 9.99], unit: '40 count', aliases: ['garbage bags', 'kitchen bags'] },
  { id: 'wm-aluminum-foil', name: 'Aluminum Foil', canonicalName: 'Aluminum Foil', category: 'Household', emoji: '📦', typicalPriceRange: [2.99, 5.49], unit: '75 sq ft', aliases: ['tin foil', 'heavy duty foil'] },
  { id: 'wm-sponges', name: 'Sponges', canonicalName: 'Sponges', category: 'Household', emoji: '🧽', typicalPriceRange: [1.99, 3.99], unit: '3 pack', aliases: ['scrub sponges', 'dish sponges'] },
  { id: 'wm-hand-soap', name: 'Hand Soap', canonicalName: 'Hand Soap', category: 'Household', emoji: '🧼', typicalPriceRange: [2.49, 4.99], unit: '7.5 oz', aliases: ['liquid hand soap', 'antibacterial soap'] },

  // Snacks
  { id: 'wm-chips', name: 'Chips', canonicalName: 'Chips', category: 'Snacks', emoji: '🥔', typicalPriceRange: [2.99, 4.99], unit: '1 bag', aliases: ['potato chips', 'tortilla chips', 'lays chips'] },
  { id: 'wm-crackers', name: 'Crackers', canonicalName: 'Crackers', category: 'Snacks', emoji: '🍘', typicalPriceRange: [2.49, 4.49], unit: '1 box', aliases: ['ritz crackers', 'saltine crackers'] },
  { id: 'wm-cookies', name: 'Cookies', canonicalName: 'Cookies', category: 'Snacks', emoji: '🍪', typicalPriceRange: [2.99, 5.49], unit: '14 oz', aliases: ['chocolate chip cookies', 'oreo cookies'] },
  { id: 'wm-popcorn', name: 'Popcorn', canonicalName: 'Popcorn', category: 'Snacks', emoji: '🍿', typicalPriceRange: [2.49, 4.99], unit: '1 bag', aliases: ['microwave popcorn', 'butter popcorn'] },
  { id: 'wm-granola-bars', name: 'Granola Bars', canonicalName: 'Granola Bars', category: 'Snacks', emoji: '🍫', typicalPriceRange: [2.99, 5.99], unit: '8 count', aliases: ['nature valley bars', 'chewy bars'] },
  { id: 'wm-pretzels', name: 'Pretzels', canonicalName: 'Pretzels', category: 'Snacks', emoji: '🥨', typicalPriceRange: [2.49, 4.49], unit: '16 oz bag', aliases: ['mini pretzels', 'pretzel twists'] },
  { id: 'wm-nuts', name: 'Nuts', canonicalName: 'Nuts', category: 'Snacks', emoji: '🥜', typicalPriceRange: [4.99, 9.99], unit: '16 oz', aliases: ['mixed nuts', 'peanuts', 'almonds'] },
  { id: 'wm-candy', name: 'Candy', canonicalName: 'Candy', category: 'Snacks', emoji: '🍬', typicalPriceRange: [1.99, 4.99], unit: '1 bag', aliases: ['chocolate bar', 'gummy candy', 'm&ms'] },

  // Bakery
  { id: 'wm-white-bread', name: 'White Bread', canonicalName: 'White Bread', category: 'Bakery', emoji: '🍞', typicalPriceRange: [1.49, 2.99], unit: '1 loaf', aliases: ['sandwich bread', 'wonder bread'] },
  { id: 'wm-hamburger-buns', name: 'Hamburger Buns', canonicalName: 'Hamburger Buns', category: 'Bakery', emoji: '🍔', typicalPriceRange: [1.99, 3.49], unit: '8 count', aliases: ['burger buns', 'hamburger rolls'] },
  { id: 'wm-bagels', name: 'Bagels', canonicalName: 'Bagels', category: 'Bakery', emoji: '🥯', typicalPriceRange: [2.99, 4.99], unit: '6 count', aliases: ['plain bagels', 'everything bagels'] },
  { id: 'wm-donuts', name: 'Donuts', canonicalName: 'Donuts', category: 'Bakery', emoji: '🍩', typicalPriceRange: [3.99, 6.99], unit: '6 count', aliases: ['glazed donuts', 'donut holes'] },
  { id: 'wm-muffins', name: 'Muffins', canonicalName: 'Muffins', category: 'Bakery', emoji: '🧁', typicalPriceRange: [3.99, 6.99], unit: '4 count', aliases: ['blueberry muffins', 'chocolate chip muffins'] },
  { id: 'wm-tortillas', name: 'Tortillas', canonicalName: 'Tortillas', category: 'Bakery', emoji: '🫓', typicalPriceRange: [1.99, 3.49], unit: '10 count', aliases: ['flour tortillas', 'corn tortillas'] },
  { id: 'wm-dinner-rolls', name: 'Dinner Rolls', canonicalName: 'Dinner Rolls', category: 'Bakery', emoji: '🍞', typicalPriceRange: [2.49, 4.49], unit: '12 count', aliases: ['hawaiian rolls', 'crescent rolls'] },
  { id: 'wm-croissants', name: 'Croissants', canonicalName: 'Croissants', category: 'Bakery', emoji: '🥐', typicalPriceRange: [3.49, 5.99], unit: '4 count', aliases: ['butter croissants', 'mini croissants'] },
];

export const POPULAR_WALMART_ITEM_NAMES = [
  'Milk',
  'Eggs',
  'Bread',
  'Bananas',
  'Rice',
  'Water',
  'Chicken Breast',
  'Paper Towels',
];

const byCanonical = new Map<string, WalmartGroceryItem>();
const byAlias = new Map<string, WalmartGroceryItem>();

for (const item of WALMART_GROCERY_CATALOG) {
  byCanonical.set(item.canonicalName.toLowerCase(), item);
  byAlias.set(item.canonicalName.toLowerCase(), item);
  for (const alias of item.aliases ?? []) {
    byAlias.set(alias.toLowerCase(), item);
  }
}

export function getWalmartItemByCanonical(canonicalName: string): WalmartGroceryItem | undefined {
  return byCanonical.get(canonicalName.trim().toLowerCase());
}

export function getWalmartItemByName(name: string): WalmartGroceryItem | undefined {
  const key = name.trim().toLowerCase();
  return byAlias.get(key) ?? byCanonical.get(key);
}

export function getWalmartTypicalPrice(item: WalmartGroceryItem): number {
  if (item.typicalPriceRange) {
    const [low, high] = item.typicalPriceRange;
    return Math.round(((low + high) / 2) * 100) / 100;
  }
  return 3.99;
}

export function getWalmartItemEmoji(canonicalName?: string, itemName?: string): string {
  if (canonicalName) {
    const match = getWalmartItemByCanonical(canonicalName);
    if (match) return match.emoji;
  }
  if (itemName) {
    const match = getWalmartItemByName(itemName);
    if (match) return match.emoji;
  }
  return '🛒';
}

export function getWalmartItemsByCategory(category: WalmartGroceryCategory): WalmartGroceryItem[] {
  return WALMART_GROCERY_CATALOG.filter((item) => item.category === category);
}

export function getPopularWalmartItems(): WalmartGroceryItem[] {
  return POPULAR_WALMART_ITEM_NAMES.map((name) => getWalmartItemByCanonical(name)).filter(
    (item): item is WalmartGroceryItem => item != null
  );
}
