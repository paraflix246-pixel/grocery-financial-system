export type GroceryStore =
  | 'walmart'
  | 'target'
  | 'kroger'
  | 'aldi'
  | 'costco'
  | 'publix'
  | 'safeway'
  | 'food-lion'
  | 'bjs';

export type GroceryCategory =
  | 'Dairy'
  | 'Produce'
  | 'Meat'
  | 'Pantry'
  | 'Frozen'
  | 'Beverages'
  | 'Household'
  | 'Snacks'
  | 'Bakery';

export type GroceryItem = {
  id: string;
  name: string;
  canonicalName: string;
  category: GroceryCategory;
  emoji: string;
  typicalPriceRange?: [number, number];
  unit?: string;
  aliases?: string[];
  /** Internal store availability tags — not shown in UI */
  stores?: GroceryStore[];
};

/** Curated common grocery items across major US retailers — not an official store API catalog. */
export const GROCERY_CATALOG_LABEL = 'Common items';

export const GROCERY_CATEGORIES: GroceryCategory[] = [
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

export const GROCERY_CATALOG: GroceryItem[] = [

  // Dairy
  { id: 'gc-milk', name: 'Milk', canonicalName: 'Milk', category: 'Dairy', emoji: '🥛', typicalPriceRange: [3.49, 4.99], unit: '1 gallon', aliases: ['whole milk', '2% milk', 'skim milk', 'great value milk'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-eggs', name: 'Eggs', canonicalName: 'Eggs', category: 'Dairy', emoji: '🥚', typicalPriceRange: [2.99, 4.49], unit: '1 dozen', aliases: ['large eggs', 'dozen eggs', 'grade a eggs'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-butter', name: 'Butter', canonicalName: 'Butter', category: 'Dairy', emoji: '🧈', typicalPriceRange: [3.49, 5.49], unit: '1 lb', aliases: ['salted butter', 'unsalted butter'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-yogurt', name: 'Yogurt', canonicalName: 'Yogurt', category: 'Dairy', emoji: '🥣', typicalPriceRange: [0.59, 1.29], unit: '1 cup', aliases: ['greek yogurt', 'plain yogurt', 'yoplait'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-cheddar', name: 'Cheddar Cheese', canonicalName: 'Cheddar Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [2.99, 5.99], unit: '8 oz', aliases: ['cheddar', 'sharp cheddar', 'block cheddar'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-shredded-cheese', name: 'Shredded Cheese', canonicalName: 'Shredded Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [2.49, 4.49], unit: '8 oz bag', aliases: ['shredded cheddar', 'mexican blend cheese'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-cream-cheese', name: 'Cream Cheese', canonicalName: 'Cream Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [1.99, 3.49], unit: '8 oz', aliases: ['philadelphia cream cheese'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-sour-cream', name: 'Sour Cream', canonicalName: 'Sour Cream', category: 'Dairy', emoji: '🥄', typicalPriceRange: [1.79, 2.99], unit: '16 oz', aliases: ['daisy sour cream'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-cottage-cheese', name: 'Cottage Cheese', canonicalName: 'Cottage Cheese', category: 'Dairy', emoji: '🥣', typicalPriceRange: [2.49, 4.29], unit: '16 oz', aliases: ['low fat cottage cheese'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-heavy-cream', name: 'Heavy Cream', canonicalName: 'Heavy Cream', category: 'Dairy', emoji: '🥛', typicalPriceRange: [2.99, 4.49], unit: '1 pint', aliases: ['whipping cream', 'heavy whipping cream'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Produce
  { id: 'gc-bananas', name: 'Bananas', canonicalName: 'Bananas', category: 'Produce', emoji: '🍌', typicalPriceRange: [0.49, 0.69], unit: 'per lb', aliases: ['banana bunch', 'organic bananas'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-apples', name: 'Apples', canonicalName: 'Apples', category: 'Produce', emoji: '🍎', typicalPriceRange: [3.99, 6.99], unit: '3 lb bag', aliases: ['gala apples', 'honeycrisp apples', 'fuji apples'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-oranges', name: 'Oranges', canonicalName: 'Oranges', category: 'Produce', emoji: '🍊', typicalPriceRange: [4.99, 7.99], unit: '4 lb bag', aliases: ['navel oranges', 'clementines'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-strawberries', name: 'Strawberries', canonicalName: 'Strawberries', category: 'Produce', emoji: '🍓', typicalPriceRange: [2.99, 5.99], unit: '1 lb', aliases: ['fresh strawberries'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-grapes', name: 'Grapes', canonicalName: 'Grapes', category: 'Produce', emoji: '🍇', typicalPriceRange: [2.49, 4.99], unit: 'per lb', aliases: ['red grapes', 'green grapes'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-tomatoes', name: 'Tomatoes', canonicalName: 'Tomatoes', category: 'Produce', emoji: '🍅', typicalPriceRange: [1.99, 3.99], unit: 'per lb', aliases: ['roma tomatoes', 'cherry tomatoes'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-lettuce', name: 'Lettuce', canonicalName: 'Lettuce', category: 'Produce', emoji: '🥬', typicalPriceRange: [1.99, 3.49], unit: '1 head', aliases: ['romaine lettuce', 'iceberg lettuce', 'salad mix'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-onions', name: 'Onions', canonicalName: 'Onions', category: 'Produce', emoji: '🧅', typicalPriceRange: [1.29, 2.49], unit: '3 lb bag', aliases: ['yellow onions', 'sweet onions'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-potatoes', name: 'Potatoes', canonicalName: 'Potatoes', category: 'Produce', emoji: '🥔', typicalPriceRange: [3.99, 6.99], unit: '5 lb bag', aliases: ['russet potatoes', 'gold potatoes'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-carrots', name: 'Carrots', canonicalName: 'Carrots', category: 'Produce', emoji: '🥕', typicalPriceRange: [1.49, 2.99], unit: '1 lb bag', aliases: ['baby carrots', 'whole carrots'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-avocados', name: 'Avocados', canonicalName: 'Avocados', category: 'Produce', emoji: '🥑', typicalPriceRange: [0.88, 1.49], unit: 'each', aliases: ['hass avocado'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-bell-peppers', name: 'Bell Peppers', canonicalName: 'Bell Peppers', category: 'Produce', emoji: '🫑', typicalPriceRange: [1.49, 2.99], unit: 'each', aliases: ['red bell pepper', 'green pepper'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Meat
  { id: 'gc-chicken-breast', name: 'Chicken Breast', canonicalName: 'Chicken Breast', category: 'Meat', emoji: '🍗', typicalPriceRange: [2.99, 5.99], unit: 'per lb', aliases: ['boneless chicken breast', 'chicken cutlets'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-ground-beef', name: 'Ground Beef', canonicalName: 'Ground Beef', category: 'Meat', emoji: '🥩', typicalPriceRange: [4.99, 8.99], unit: 'per lb', aliases: ['80/20 ground beef', 'lean ground beef'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-pork-chops', name: 'Pork Chops', canonicalName: 'Pork Chops', category: 'Meat', emoji: '🥩', typicalPriceRange: [3.49, 6.99], unit: 'per lb', aliases: ['bone-in pork chops'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-bacon', name: 'Bacon', canonicalName: 'Bacon', category: 'Meat', emoji: '🥓', typicalPriceRange: [4.99, 7.99], unit: '12 oz', aliases: ['thick cut bacon', 'turkey bacon'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-sausage', name: 'Sausage', canonicalName: 'Sausage', category: 'Meat', emoji: '🌭', typicalPriceRange: [2.99, 5.49], unit: '1 lb', aliases: ['breakfast sausage', 'italian sausage'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-deli-turkey', name: 'Deli Turkey', canonicalName: 'Deli Turkey', category: 'Meat', emoji: '🦃', typicalPriceRange: [3.99, 6.99], unit: 'per lb', aliases: ['sliced turkey', 'oven roasted turkey'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-salmon', name: 'Salmon Fillets', canonicalName: 'Salmon Fillets', category: 'Meat', emoji: '🐟', typicalPriceRange: [7.99, 12.99], unit: 'per lb', aliases: ['atlantic salmon', 'salmon fillet'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-hot-dogs', name: 'Hot Dogs', canonicalName: 'Hot Dogs', category: 'Meat', emoji: '🌭', typicalPriceRange: [1.99, 4.49], unit: '8 pack', aliases: ['frankfurters', 'beef hot dogs'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Pantry
  { id: 'gc-bread', name: 'Bread', canonicalName: 'Bread', category: 'Pantry', emoji: '🍞', typicalPriceRange: [1.99, 3.49], unit: '1 loaf', aliases: ['white bread', 'wheat bread', 'sandwich bread'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-rice', name: 'Rice', canonicalName: 'Rice', category: 'Pantry', emoji: '🍚', typicalPriceRange: [2.99, 5.49], unit: '2 lb bag', aliases: ['white rice', 'jasmine rice', 'basmati rice'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-pasta', name: 'Pasta', canonicalName: 'Pasta', category: 'Pantry', emoji: '🍝', typicalPriceRange: [1.19, 2.49], unit: '1 box', aliases: ['spaghetti', 'penne', 'macaroni'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-flour', name: 'Flour', canonicalName: 'Flour', category: 'Pantry', emoji: '🌾', typicalPriceRange: [2.49, 4.99], unit: '5 lb bag', aliases: ['all purpose flour', 'self rising flour'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-sugar', name: 'Sugar', canonicalName: 'Sugar', category: 'Pantry', emoji: '🧂', typicalPriceRange: [2.49, 4.49], unit: '4 lb bag', aliases: ['granulated sugar', 'brown sugar'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-cooking-oil', name: 'Cooking Oil', canonicalName: 'Cooking Oil', category: 'Pantry', emoji: '🫒', typicalPriceRange: [3.99, 7.99], unit: '48 oz', aliases: ['vegetable oil', 'canola oil', 'olive oil'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-canned-beans', name: 'Canned Beans', canonicalName: 'Canned Beans', category: 'Pantry', emoji: '🫘', typicalPriceRange: [0.78, 1.29], unit: '15 oz can', aliases: ['black beans', 'pinto beans', 'kidney beans'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-peanut-butter', name: 'Peanut Butter', canonicalName: 'Peanut Butter', category: 'Pantry', emoji: '🥜', typicalPriceRange: [2.49, 4.99], unit: '16 oz jar', aliases: ['creamy peanut butter', 'jif peanut butter'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-cereal', name: 'Cereal', canonicalName: 'Cereal', category: 'Pantry', emoji: '🥣', typicalPriceRange: [3.49, 5.99], unit: '1 box', aliases: ['cheerios', 'frosted flakes', 'corn flakes'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-oatmeal', name: 'Oatmeal', canonicalName: 'Oatmeal', category: 'Pantry', emoji: '🥣', typicalPriceRange: [2.99, 4.99], unit: '42 oz', aliases: ['quick oats', 'instant oatmeal'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-tomato-sauce', name: 'Tomato Sauce', canonicalName: 'Tomato Sauce', category: 'Pantry', emoji: '🍅', typicalPriceRange: [0.98, 1.79], unit: '15 oz can', aliases: ['marinara sauce', 'pasta sauce'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-chicken-broth', name: 'Chicken Broth', canonicalName: 'Chicken Broth', category: 'Pantry', emoji: '🍲', typicalPriceRange: [1.49, 2.99], unit: '32 oz', aliases: ['chicken stock', 'bone broth'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Frozen
  { id: 'gc-frozen-pizza', name: 'Frozen Pizza', canonicalName: 'Frozen Pizza', category: 'Frozen', emoji: '🍕', typicalPriceRange: [4.99, 8.99], unit: '1 pizza', aliases: ['pepperoni pizza', 'digiorno pizza'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-ice-cream', name: 'Ice Cream', canonicalName: 'Ice Cream', category: 'Frozen', emoji: '🍦', typicalPriceRange: [3.99, 6.99], unit: '48 oz', aliases: ['vanilla ice cream', 'great value ice cream'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-vegetables', name: 'Frozen Vegetables', canonicalName: 'Frozen Vegetables', category: 'Frozen', emoji: '🥦', typicalPriceRange: [1.49, 2.99], unit: '12 oz bag', aliases: ['frozen broccoli', 'mixed vegetables', 'steamable veggies'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-fries', name: 'Frozen Fries', canonicalName: 'Frozen Fries', category: 'Frozen', emoji: '🍟', typicalPriceRange: [2.99, 4.99], unit: '32 oz bag', aliases: ['french fries', 'crinkle cut fries'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-waffles', name: 'Frozen Waffles', canonicalName: 'Frozen Waffles', category: 'Frozen', emoji: '🧇', typicalPriceRange: [2.49, 4.49], unit: '12 count', aliases: ['eggo waffles', 'homestyle waffles'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-berries', name: 'Frozen Berries', canonicalName: 'Frozen Berries', category: 'Frozen', emoji: '🫐', typicalPriceRange: [2.99, 5.49], unit: '16 oz bag', aliases: ['frozen blueberries', 'mixed berries'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-nuggets', name: 'Frozen Chicken Nuggets', canonicalName: 'Frozen Chicken Nuggets', category: 'Frozen', emoji: '🍗', typicalPriceRange: [4.99, 8.99], unit: '29 oz bag', aliases: ['chicken nuggets', 'dino nuggets'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-fish', name: 'Frozen Fish Sticks', canonicalName: 'Frozen Fish Sticks', category: 'Frozen', emoji: '🐟', typicalPriceRange: [3.99, 6.99], unit: '18 count', aliases: ['fish fillets', 'breaded fish'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Beverages
  { id: 'gc-water', name: 'Water', canonicalName: 'Water', category: 'Beverages', emoji: '💧', typicalPriceRange: [3.99, 6.99], unit: '24 pack', aliases: ['bottled water', 'spring water', 'purified water'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-juice', name: 'Juice', canonicalName: 'Juice', category: 'Beverages', emoji: '🧃', typicalPriceRange: [2.99, 4.99], unit: '64 oz', aliases: ['apple juice', 'cranberry juice'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-soda', name: 'Soda', canonicalName: 'Soda', category: 'Beverages', emoji: '🥤', typicalPriceRange: [4.99, 8.99], unit: '12 pack', aliases: ['cola', 'pepsi', 'coke', 'soft drink'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-coffee', name: 'Coffee', canonicalName: 'Coffee', category: 'Beverages', emoji: '☕', typicalPriceRange: [5.99, 12.99], unit: '12 oz bag', aliases: ['ground coffee', 'folgers coffee', 'maxwell house'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-tea', name: 'Tea', canonicalName: 'Tea', category: 'Beverages', emoji: '🍵', typicalPriceRange: [2.49, 5.99], unit: '20 bags', aliases: ['black tea', 'green tea', 'herbal tea'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-sports-drink', name: 'Sports Drink', canonicalName: 'Sports Drink', category: 'Beverages', emoji: '🥤', typicalPriceRange: [1.29, 2.49], unit: '32 oz', aliases: ['gatorade', 'powerade'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-almond-milk', name: 'Almond Milk', canonicalName: 'Almond Milk', category: 'Beverages', emoji: '🥛', typicalPriceRange: [2.49, 4.49], unit: '64 oz', aliases: ['unsweetened almond milk', 'vanilla almond milk'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-orange-juice', name: 'Orange Juice', canonicalName: 'Orange Juice', category: 'Beverages', emoji: '🍊', typicalPriceRange: [3.49, 5.99], unit: '52 oz', aliases: ['oj', 'no pulp orange juice'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-bottled-tea', name: 'Bottled Tea', canonicalName: 'Bottled Tea', category: 'Beverages', emoji: '🍵', typicalPriceRange: [1.49, 2.99], unit: '16 oz', aliases: ['sweet tea', 'arizona tea', 'iced tea'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-energy-drink', name: 'Energy Drink', canonicalName: 'Energy Drink', category: 'Beverages', emoji: '⚡', typicalPriceRange: [1.99, 3.49], unit: '16 oz', aliases: ['red bull', 'monster energy'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Household
  { id: 'gc-paper-towels', name: 'Paper Towels', canonicalName: 'Paper Towels', category: 'Household', emoji: '🧻', typicalPriceRange: [5.49, 9.99], unit: '6 roll pack', aliases: ['paper towel', 'bounty paper towels'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-toilet-paper', name: 'Toilet Paper', canonicalName: 'Toilet Paper', category: 'Household', emoji: '🧻', typicalPriceRange: [6.99, 12.99], unit: '12 roll pack', aliases: ['bath tissue', 'tp'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-dish-soap', name: 'Dish Soap', canonicalName: 'Dish Soap', category: 'Household', emoji: '🧴', typicalPriceRange: [2.49, 4.49], unit: '24 oz', aliases: ['dawn dish soap', 'dish detergent'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-laundry-detergent', name: 'Laundry Detergent', canonicalName: 'Laundry Detergent', category: 'Household', emoji: '🧺', typicalPriceRange: [8.99, 14.99], unit: '100 oz', aliases: ['tide detergent', 'liquid detergent'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-trash-bags', name: 'Trash Bags', canonicalName: 'Trash Bags', category: 'Household', emoji: '🗑️', typicalPriceRange: [4.99, 9.99], unit: '40 count', aliases: ['garbage bags', 'kitchen bags'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-aluminum-foil', name: 'Aluminum Foil', canonicalName: 'Aluminum Foil', category: 'Household', emoji: '📦', typicalPriceRange: [2.99, 5.49], unit: '75 sq ft', aliases: ['tin foil', 'heavy duty foil'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-sponges', name: 'Sponges', canonicalName: 'Sponges', category: 'Household', emoji: '🧽', typicalPriceRange: [1.99, 3.99], unit: '3 pack', aliases: ['scrub sponges', 'dish sponges'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-hand-soap', name: 'Hand Soap', canonicalName: 'Hand Soap', category: 'Household', emoji: '🧼', typicalPriceRange: [2.49, 4.99], unit: '7.5 oz', aliases: ['liquid hand soap', 'antibacterial soap'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Snacks
  { id: 'gc-chips', name: 'Chips', canonicalName: 'Chips', category: 'Snacks', emoji: '🥔', typicalPriceRange: [2.99, 4.99], unit: '1 bag', aliases: ['potato chips', 'tortilla chips', 'lays chips'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-crackers', name: 'Crackers', canonicalName: 'Crackers', category: 'Snacks', emoji: '🍘', typicalPriceRange: [2.49, 4.49], unit: '1 box', aliases: ['ritz crackers', 'saltine crackers'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-cookies', name: 'Cookies', canonicalName: 'Cookies', category: 'Snacks', emoji: '🍪', typicalPriceRange: [2.99, 5.49], unit: '14 oz', aliases: ['chocolate chip cookies', 'oreo cookies'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-popcorn', name: 'Popcorn', canonicalName: 'Popcorn', category: 'Snacks', emoji: '🍿', typicalPriceRange: [2.49, 4.99], unit: '1 bag', aliases: ['microwave popcorn', 'butter popcorn'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-granola-bars', name: 'Granola Bars', canonicalName: 'Granola Bars', category: 'Snacks', emoji: '🍫', typicalPriceRange: [2.99, 5.99], unit: '8 count', aliases: ['nature valley bars', 'chewy bars'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-pretzels', name: 'Pretzels', canonicalName: 'Pretzels', category: 'Snacks', emoji: '🥨', typicalPriceRange: [2.49, 4.49], unit: '16 oz bag', aliases: ['mini pretzels', 'pretzel twists'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-nuts', name: 'Nuts', canonicalName: 'Nuts', category: 'Snacks', emoji: '🥜', typicalPriceRange: [4.99, 9.99], unit: '16 oz', aliases: ['mixed nuts', 'peanuts', 'almonds'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-candy', name: 'Candy', canonicalName: 'Candy', category: 'Snacks', emoji: '🍬', typicalPriceRange: [1.99, 4.99], unit: '1 bag', aliases: ['chocolate bar', 'gummy candy', 'm&ms'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Bakery
  { id: 'gc-white-bread', name: 'White Bread', canonicalName: 'White Bread', category: 'Bakery', emoji: '🍞', typicalPriceRange: [1.49, 2.99], unit: '1 loaf', aliases: ['sandwich bread', 'wonder bread'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-hamburger-buns', name: 'Hamburger Buns', canonicalName: 'Hamburger Buns', category: 'Bakery', emoji: '🍔', typicalPriceRange: [1.99, 3.49], unit: '8 count', aliases: ['burger buns', 'hamburger rolls'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-bagels', name: 'Bagels', canonicalName: 'Bagels', category: 'Bakery', emoji: '🥯', typicalPriceRange: [2.99, 4.99], unit: '6 count', aliases: ['plain bagels', 'everything bagels'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-donuts', name: 'Donuts', canonicalName: 'Donuts', category: 'Bakery', emoji: '🍩', typicalPriceRange: [3.99, 6.99], unit: '6 count', aliases: ['glazed donuts', 'donut holes'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-muffins', name: 'Muffins', canonicalName: 'Muffins', category: 'Bakery', emoji: '🧁', typicalPriceRange: [3.99, 6.99], unit: '4 count', aliases: ['blueberry muffins', 'chocolate chip muffins'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-tortillas', name: 'Tortillas', canonicalName: 'Tortillas', category: 'Bakery', emoji: '🫓', typicalPriceRange: [1.99, 3.49], unit: '10 count', aliases: ['flour tortillas', 'corn tortillas'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-dinner-rolls', name: 'Dinner Rolls', canonicalName: 'Dinner Rolls', category: 'Bakery', emoji: '🍞', typicalPriceRange: [2.49, 4.49], unit: '12 count', aliases: ['hawaiian rolls', 'crescent rolls'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-croissants', name: 'Croissants', canonicalName: 'Croissants', category: 'Bakery', emoji: '🥐', typicalPriceRange: [3.49, 5.99], unit: '4 count', aliases: ['butter croissants', 'mini croissants'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Additional produce
  { id: 'gc-blueberries', name: 'Blueberries', canonicalName: 'Blueberries', category: 'Produce', emoji: '🫐', typicalPriceRange: [3.99, 6.99], unit: '1 pint', aliases: ['fresh blueberries'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-raspberries', name: 'Raspberries', canonicalName: 'Raspberries', category: 'Produce', emoji: '🍓', typicalPriceRange: [3.99, 5.99], unit: '6 oz', aliases: ['fresh raspberries'], stores: ['walmart', 'target', 'kroger', 'publix', 'safeway'] },
  { id: 'gc-lemons', name: 'Lemons', canonicalName: 'Lemons', category: 'Produce', emoji: '🍋', typicalPriceRange: [0.59, 0.99], unit: 'each', aliases: ['lemon'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-limes', name: 'Limes', canonicalName: 'Limes', category: 'Produce', emoji: '🍋', typicalPriceRange: [0.39, 0.79], unit: 'each', aliases: ['lime'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-broccoli', name: 'Broccoli', canonicalName: 'Broccoli', category: 'Produce', emoji: '🥦', typicalPriceRange: [1.99, 3.49], unit: '1 bunch', aliases: ['broccoli crown', 'broccoli florets'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-cauliflower', name: 'Cauliflower', canonicalName: 'Cauliflower', category: 'Produce', emoji: '🥦', typicalPriceRange: [2.49, 4.49], unit: '1 head', aliases: ['cauliflower head'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-spinach', name: 'Spinach', canonicalName: 'Spinach', category: 'Produce', emoji: '🥬', typicalPriceRange: [1.99, 3.49], unit: '5 oz bag', aliases: ['baby spinach', 'spinach leaves'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-kale', name: 'Kale', canonicalName: 'Kale', category: 'Produce', emoji: '🥬', typicalPriceRange: [2.49, 3.99], unit: '1 bunch', aliases: ['curly kale', 'lacinato kale'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway'] },
  { id: 'gc-cucumbers', name: 'Cucumbers', canonicalName: 'Cucumbers', category: 'Produce', emoji: '🥒', typicalPriceRange: [0.69, 1.29], unit: 'each', aliases: ['english cucumber', 'persian cucumber'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-zucchini', name: 'Zucchini', canonicalName: 'Zucchini', category: 'Produce', emoji: '🥒', typicalPriceRange: [1.29, 2.49], unit: 'per lb', aliases: ['summer squash'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-mushrooms', name: 'Mushrooms', canonicalName: 'Mushrooms', category: 'Produce', emoji: '🍄', typicalPriceRange: [2.49, 4.49], unit: '8 oz', aliases: ['white mushrooms', 'baby bella mushrooms', 'portobello'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-garlic', name: 'Garlic', canonicalName: 'Garlic', category: 'Produce', emoji: '🧄', typicalPriceRange: [0.79, 1.49], unit: '1 bulb', aliases: ['garlic bulb', 'fresh garlic'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-ginger', name: 'Ginger', canonicalName: 'Ginger', category: 'Produce', emoji: '🫚', typicalPriceRange: [2.99, 4.99], unit: 'per lb', aliases: ['fresh ginger root'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway'] },
  { id: 'gc-celery', name: 'Celery', canonicalName: 'Celery', category: 'Produce', emoji: '🥬', typicalPriceRange: [1.79, 2.99], unit: '1 bunch', aliases: ['celery stalks'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-watermelon', name: 'Watermelon', canonicalName: 'Watermelon', category: 'Produce', emoji: '🍉', typicalPriceRange: [4.99, 8.99], unit: 'each', aliases: ['seedless watermelon'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-pineapple', name: 'Pineapple', canonicalName: 'Pineapple', category: 'Produce', emoji: '🍍', typicalPriceRange: [2.49, 4.49], unit: 'each', aliases: ['fresh pineapple'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-mango', name: 'Mango', canonicalName: 'Mango', category: 'Produce', emoji: '🥭', typicalPriceRange: [0.99, 1.99], unit: 'each', aliases: ['ataulfo mango', 'red mango'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-peaches', name: 'Peaches', canonicalName: 'Peaches', category: 'Produce', emoji: '🍑', typicalPriceRange: [2.49, 4.99], unit: 'per lb', aliases: ['yellow peaches', 'white peaches'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-pears', name: 'Pears', canonicalName: 'Pears', category: 'Produce', emoji: '🍐', typicalPriceRange: [1.99, 3.49], unit: 'per lb', aliases: ['bartlett pears', 'anjou pears'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-green-beans', name: 'Green Beans', canonicalName: 'Green Beans', category: 'Produce', emoji: '🫛', typicalPriceRange: [2.49, 4.49], unit: '1 lb', aliases: ['string beans', 'snap beans'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-asparagus', name: 'Asparagus', canonicalName: 'Asparagus', category: 'Produce', emoji: '🥬', typicalPriceRange: [2.99, 4.99], unit: '1 lb', aliases: ['asparagus bunch'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-sweet-potatoes', name: 'Sweet Potatoes', canonicalName: 'Sweet Potatoes', category: 'Produce', emoji: '🍠', typicalPriceRange: [1.29, 2.49], unit: 'per lb', aliases: ['yams', 'garnet sweet potato'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-jalapenos', name: 'Jalapeños', canonicalName: 'Jalapeños', category: 'Produce', emoji: '🌶️', typicalPriceRange: [0.49, 0.99], unit: 'per lb', aliases: ['jalapeno peppers'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-cilantro', name: 'Cilantro', canonicalName: 'Cilantro', category: 'Produce', emoji: '🌿', typicalPriceRange: [0.79, 1.49], unit: '1 bunch', aliases: ['fresh cilantro', 'coriander leaves'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-basil', name: 'Basil', canonicalName: 'Basil', category: 'Produce', emoji: '🌿', typicalPriceRange: [1.99, 3.49], unit: '0.75 oz', aliases: ['fresh basil'], stores: ['walmart', 'target', 'kroger', 'publix', 'safeway'] },

  // Additional dairy
  { id: 'gc-mozzarella', name: 'Mozzarella Cheese', canonicalName: 'Mozzarella Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [2.99, 5.49], unit: '16 oz', aliases: ['mozzarella', 'fresh mozzarella', 'shredded mozzarella'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-parmesan', name: 'Parmesan Cheese', canonicalName: 'Parmesan Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [3.99, 7.99], unit: '8 oz', aliases: ['parmesan', 'grated parmesan', 'parmigiano reggiano'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-string-cheese', name: 'String Cheese', canonicalName: 'String Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [2.99, 4.99], unit: '12 count', aliases: ['mozzarella sticks', 'cheese sticks'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-half-and-half', name: 'Half and Half', canonicalName: 'Half and Half', category: 'Dairy', emoji: '🥛', typicalPriceRange: [2.49, 3.99], unit: '32 oz', aliases: ['half & half', 'coffee creamer half and half'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-feta', name: 'Feta Cheese', canonicalName: 'Feta Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [3.49, 5.99], unit: '8 oz', aliases: ['crumbled feta', 'feta crumbles'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-swiss-cheese', name: 'Swiss Cheese', canonicalName: 'Swiss Cheese', category: 'Dairy', emoji: '🧀', typicalPriceRange: [2.99, 5.49], unit: '8 oz', aliases: ['swiss slices', 'swiss block'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-whipped-cream', name: 'Whipped Cream', canonicalName: 'Whipped Cream', category: 'Dairy', emoji: '🍦', typicalPriceRange: [2.49, 3.99], unit: '7 oz can', aliases: ['cool whip', 'aerosol whipped cream'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-oat-milk-dairy', name: 'Oat Milk', canonicalName: 'Oat Milk', category: 'Dairy', emoji: '🥛', typicalPriceRange: [3.49, 5.49], unit: '64 oz', aliases: ['oat beverage', 'unsweetened oat milk'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-lactose-free-milk', name: 'Lactose Free Milk', canonicalName: 'Lactose Free Milk', category: 'Dairy', emoji: '🥛', typicalPriceRange: [4.49, 5.99], unit: '64 oz', aliases: ['lactaid milk', 'lactose-free milk'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Additional meat & seafood
  { id: 'gc-ground-turkey', name: 'Ground Turkey', canonicalName: 'Ground Turkey', category: 'Meat', emoji: '🦃', typicalPriceRange: [3.99, 6.99], unit: 'per lb', aliases: ['lean ground turkey', '93% lean turkey'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-chicken-thighs', name: 'Chicken Thighs', canonicalName: 'Chicken Thighs', category: 'Meat', emoji: '🍗', typicalPriceRange: [2.49, 4.99], unit: 'per lb', aliases: ['bone-in chicken thighs', 'boneless chicken thighs'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-steak', name: 'Steak', canonicalName: 'Steak', category: 'Meat', emoji: '🥩', typicalPriceRange: [8.99, 16.99], unit: 'per lb', aliases: ['ribeye steak', 'sirloin steak', 'ny strip steak'], stores: ['walmart', 'target', 'kroger', 'costco', 'publix', 'safeway', 'bjs'] },
  { id: 'gc-shrimp', name: 'Shrimp', canonicalName: 'Shrimp', category: 'Meat', emoji: '🦐', typicalPriceRange: [7.99, 12.99], unit: 'per lb', aliases: ['raw shrimp', 'peeled shrimp', 'frozen shrimp'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-tilapia', name: 'Tilapia', canonicalName: 'Tilapia', category: 'Meat', emoji: '🐟', typicalPriceRange: [5.99, 8.99], unit: 'per lb', aliases: ['tilapia fillets'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-canned-tuna', name: 'Canned Tuna', canonicalName: 'Canned Tuna', category: 'Meat', emoji: '🐟', typicalPriceRange: [1.29, 2.49], unit: '5 oz can', aliases: ['tuna in water', 'chunk light tuna', 'albacore tuna'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-ham', name: 'Ham', canonicalName: 'Ham', category: 'Meat', emoji: '🍖', typicalPriceRange: [3.99, 7.99], unit: 'per lb', aliases: ['deli ham', 'honey ham', 'spiral ham'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-rotisserie-chicken', name: 'Rotisserie Chicken', canonicalName: 'Rotisserie Chicken', category: 'Meat', emoji: '🍗', typicalPriceRange: [5.99, 8.99], unit: 'each', aliases: ['hot rotisserie chicken', 'whole rotisserie chicken'], stores: ['walmart', 'target', 'kroger', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-pepperoni', name: 'Pepperoni', canonicalName: 'Pepperoni', category: 'Meat', emoji: '🍕', typicalPriceRange: [3.49, 5.99], unit: '6 oz', aliases: ['sliced pepperoni', 'pepperoni sticks'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-meatballs', name: 'Meatballs', canonicalName: 'Meatballs', category: 'Meat', emoji: '🍖', typicalPriceRange: [4.99, 7.99], unit: '32 oz', aliases: ['frozen meatballs', 'italian meatballs'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Additional pantry
  { id: 'gc-ketchup', name: 'Ketchup', canonicalName: 'Ketchup', category: 'Pantry', emoji: '🍅', typicalPriceRange: [2.49, 4.49], unit: '32 oz', aliases: ['tomato ketchup', 'heinz ketchup'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-mustard', name: 'Mustard', canonicalName: 'Mustard', category: 'Pantry', emoji: '🌭', typicalPriceRange: [1.49, 2.99], unit: '14 oz', aliases: ['yellow mustard', 'dijon mustard', 'honey mustard'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-mayonnaise', name: 'Mayonnaise', canonicalName: 'Mayonnaise', category: 'Pantry', emoji: '🥪', typicalPriceRange: [3.49, 5.99], unit: '30 oz', aliases: ['mayo', 'hellmanns mayo'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-olive-oil', name: 'Olive Oil', canonicalName: 'Olive Oil', category: 'Pantry', emoji: '🫒', typicalPriceRange: [5.99, 11.99], unit: '17 oz', aliases: ['extra virgin olive oil', 'evoo'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-soy-sauce', name: 'Soy Sauce', canonicalName: 'Soy Sauce', category: 'Pantry', emoji: '🍶', typicalPriceRange: [2.49, 4.49], unit: '15 oz', aliases: ['low sodium soy sauce', 'tamari'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-hot-sauce', name: 'Hot Sauce', canonicalName: 'Hot Sauce', category: 'Pantry', emoji: '🌶️', typicalPriceRange: [2.49, 4.99], unit: '12 oz', aliases: ['tabasco', 'sriracha', 'franks red hot'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-honey', name: 'Honey', canonicalName: 'Honey', category: 'Pantry', emoji: '🍯', typicalPriceRange: [4.99, 8.99], unit: '12 oz', aliases: ['raw honey', 'clover honey'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-maple-syrup', name: 'Maple Syrup', canonicalName: 'Maple Syrup', category: 'Pantry', emoji: '🍁', typicalPriceRange: [5.99, 10.99], unit: '12 oz', aliases: ['pure maple syrup', 'pancake syrup'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-baking-soda', name: 'Baking Soda', canonicalName: 'Baking Soda', category: 'Pantry', emoji: '🧂', typicalPriceRange: [0.99, 1.99], unit: '16 oz', aliases: ['sodium bicarbonate'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-baking-powder', name: 'Baking Powder', canonicalName: 'Baking Powder', category: 'Pantry', emoji: '🧂', typicalPriceRange: [1.99, 3.49], unit: '8 oz', aliases: ['double acting baking powder'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-brown-rice', name: 'Brown Rice', canonicalName: 'Brown Rice', category: 'Pantry', emoji: '🍚', typicalPriceRange: [2.49, 4.49], unit: '2 lb bag', aliases: ['long grain brown rice', 'instant brown rice'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-quinoa', name: 'Quinoa', canonicalName: 'Quinoa', category: 'Pantry', emoji: '🌾', typicalPriceRange: [3.99, 6.99], unit: '12 oz', aliases: ['white quinoa', 'tri-color quinoa'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-lentils', name: 'Lentils', canonicalName: 'Lentils', category: 'Pantry', emoji: '🫘', typicalPriceRange: [1.49, 2.99], unit: '16 oz bag', aliases: ['red lentils', 'green lentils'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-salsa', name: 'Salsa', canonicalName: 'Salsa', category: 'Pantry', emoji: '🫙', typicalPriceRange: [2.49, 4.49], unit: '16 oz', aliases: ['mild salsa', 'chunky salsa', 'restaurant style salsa'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-salad-dressing', name: 'Salad Dressing', canonicalName: 'Salad Dressing', category: 'Pantry', emoji: '🥗', typicalPriceRange: [2.49, 4.99], unit: '16 oz', aliases: ['ranch dressing', 'italian dressing', 'caesar dressing'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-chicken-noodle-soup', name: 'Chicken Noodle Soup', canonicalName: 'Chicken Noodle Soup', category: 'Pantry', emoji: '🍲', typicalPriceRange: [1.49, 2.49], unit: '10.5 oz can', aliases: ['campbells chicken noodle', 'canned soup'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-taco-shells', name: 'Taco Shells', canonicalName: 'Taco Shells', category: 'Pantry', emoji: '🌮', typicalPriceRange: [1.99, 3.49], unit: '12 count', aliases: ['hard taco shells', 'taco kits'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-taco-seasoning', name: 'Taco Seasoning', canonicalName: 'Taco Seasoning', category: 'Pantry', emoji: '🌮', typicalPriceRange: [0.79, 1.49], unit: '1 oz packet', aliases: ['taco mix', 'old el paso seasoning'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-jam', name: 'Jam', canonicalName: 'Jam', category: 'Pantry', emoji: '🍓', typicalPriceRange: [2.99, 4.99], unit: '18 oz', aliases: ['strawberry jam', 'grape jelly', 'preserves'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-ramen', name: 'Ramen Noodles', canonicalName: 'Ramen Noodles', category: 'Pantry', emoji: '🍜', typicalPriceRange: [0.39, 0.79], unit: '3 oz pack', aliases: ['instant ramen', 'maruchan ramen', 'top ramen'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-pancake-mix', name: 'Pancake Mix', canonicalName: 'Pancake Mix', category: 'Pantry', emoji: '🥞', typicalPriceRange: [2.49, 4.49], unit: '32 oz', aliases: ['bisquick', 'buttermilk pancake mix'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-salt', name: 'Salt', canonicalName: 'Salt', category: 'Pantry', emoji: '🧂', typicalPriceRange: [0.99, 2.49], unit: '26 oz', aliases: ['table salt', 'iodized salt', 'sea salt'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-black-pepper', name: 'Black Pepper', canonicalName: 'Black Pepper', category: 'Pantry', emoji: '🧂', typicalPriceRange: [2.49, 4.99], unit: '4 oz', aliases: ['ground black pepper', 'pepper grinder'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-coconut-oil', name: 'Coconut Oil', canonicalName: 'Coconut Oil', category: 'Pantry', emoji: '🥥', typicalPriceRange: [5.99, 9.99], unit: '14 oz', aliases: ['virgin coconut oil', 'refined coconut oil'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-vanilla-extract', name: 'Vanilla Extract', canonicalName: 'Vanilla Extract', category: 'Pantry', emoji: '🧁', typicalPriceRange: [4.99, 9.99], unit: '2 oz', aliases: ['pure vanilla extract', 'vanilla flavoring'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-chocolate-chips', name: 'Chocolate Chips', canonicalName: 'Chocolate Chips', category: 'Pantry', emoji: '🍫', typicalPriceRange: [2.99, 4.99], unit: '12 oz', aliases: ['semi sweet chocolate chips', 'nestle toll house chips'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Additional frozen
  { id: 'gc-frozen-burritos', name: 'Frozen Burritos', canonicalName: 'Frozen Burritos', category: 'Frozen', emoji: '🌯', typicalPriceRange: [1.29, 2.49], unit: 'each', aliases: ['bean burrito', 'breakfast burrito'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-frozen-lasagna', name: 'Frozen Lasagna', canonicalName: 'Frozen Lasagna', category: 'Frozen', emoji: '🍝', typicalPriceRange: [5.99, 9.99], unit: '1 tray', aliases: ['stouffers lasagna', 'meat lasagna frozen'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-garlic-bread', name: 'Frozen Garlic Bread', canonicalName: 'Frozen Garlic Bread', category: 'Frozen', emoji: '🍞', typicalPriceRange: [2.49, 4.49], unit: '1 loaf', aliases: ['texas toast garlic bread'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-tater-tots', name: 'Frozen Tater Tots', canonicalName: 'Frozen Tater Tots', category: 'Frozen', emoji: '🍟', typicalPriceRange: [2.99, 4.99], unit: '32 oz', aliases: ['tater tots', 'potato puffs'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-potstickers', name: 'Frozen Potstickers', canonicalName: 'Frozen Potstickers', category: 'Frozen', emoji: '🥟', typicalPriceRange: [4.99, 7.99], unit: '24 oz', aliases: ['gyoza', 'dumplings frozen'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-frozen-breakfast-sandwich', name: 'Frozen Breakfast Sandwich', canonicalName: 'Frozen Breakfast Sandwich', category: 'Frozen', emoji: '🥪', typicalPriceRange: [3.99, 6.99], unit: '4 count', aliases: ['sausage egg sandwich', 'breakfast croissant sandwich'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-corn', name: 'Frozen Corn', canonicalName: 'Frozen Corn', category: 'Frozen', emoji: '🌽', typicalPriceRange: [1.29, 2.49], unit: '12 oz bag', aliases: ['sweet corn frozen', 'kernel corn'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-frozen-peas', name: 'Frozen Peas', canonicalName: 'Frozen Peas', category: 'Frozen', emoji: '🫛', typicalPriceRange: [1.29, 2.49], unit: '12 oz bag', aliases: ['green peas frozen'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Additional beverages
  { id: 'gc-sparkling-water', name: 'Sparkling Water', canonicalName: 'Sparkling Water', category: 'Beverages', emoji: '💧', typicalPriceRange: [3.99, 6.99], unit: '8 pack', aliases: ['la croix', 'seltzer water', 'carbonated water'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-coconut-water', name: 'Coconut Water', canonicalName: 'Coconut Water', category: 'Beverages', emoji: '🥥', typicalPriceRange: [2.49, 4.49], unit: '33.8 oz', aliases: ['vita coco', 'pure coconut water'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-lemonade', name: 'Lemonade', canonicalName: 'Lemonade', category: 'Beverages', emoji: '🍋', typicalPriceRange: [2.49, 4.49], unit: '64 oz', aliases: ['pink lemonade', 'simply lemonade'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-soy-milk', name: 'Soy Milk', canonicalName: 'Soy Milk', category: 'Beverages', emoji: '🥛', typicalPriceRange: [2.99, 4.49], unit: '64 oz', aliases: ['unsweetened soy milk', 'silk soy milk'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-cranberry-juice', name: 'Cranberry Juice', canonicalName: 'Cranberry Juice', category: 'Beverages', emoji: '🧃', typicalPriceRange: [3.49, 5.49], unit: '64 oz', aliases: ['cranberry cocktail', '100% cranberry juice'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-grape-juice', name: 'Grape Juice', canonicalName: 'Grape Juice', category: 'Beverages', emoji: '🍇', typicalPriceRange: [2.99, 4.99], unit: '64 oz', aliases: ['concord grape juice', 'welchs grape juice'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-protein-shake', name: 'Protein Shake', canonicalName: 'Protein Shake', category: 'Beverages', emoji: '💪', typicalPriceRange: [1.99, 3.49], unit: '11 oz', aliases: ['premier protein', 'muscle milk', 'ready to drink protein'], stores: ['walmart', 'target', 'kroger', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-iced-coffee', name: 'Iced Coffee', canonicalName: 'Iced Coffee', category: 'Beverages', emoji: '☕', typicalPriceRange: [2.49, 4.49], unit: '48 oz', aliases: ['cold brew coffee', 'starbucks iced coffee bottle'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },

  // Additional household
  { id: 'gc-plastic-wrap', name: 'Plastic Wrap', canonicalName: 'Plastic Wrap', category: 'Household', emoji: '📦', typicalPriceRange: [2.49, 4.99], unit: '200 sq ft', aliases: ['cling wrap', 'saran wrap'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-ziploc-bags', name: 'Ziploc Bags', canonicalName: 'Ziploc Bags', category: 'Household', emoji: '📦', typicalPriceRange: [3.49, 6.99], unit: '20 count', aliases: ['freezer bags', 'sandwich bags', 'storage bags'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-dryer-sheets', name: 'Dryer Sheets', canonicalName: 'Dryer Sheets', category: 'Household', emoji: '🧺', typicalPriceRange: [4.99, 8.99], unit: '120 count', aliases: ['bounce dryer sheets', 'fabric softener sheets'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-fabric-softener', name: 'Fabric Softener', canonicalName: 'Fabric Softener', category: 'Household', emoji: '🧺', typicalPriceRange: [4.99, 8.99], unit: '64 oz', aliases: ['downy fabric softener', 'liquid softener'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-bleach', name: 'Bleach', canonicalName: 'Bleach', category: 'Household', emoji: '🧴', typicalPriceRange: [3.49, 5.99], unit: '121 oz', aliases: ['clorox bleach', 'disinfecting bleach'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-all-purpose-cleaner', name: 'All Purpose Cleaner', canonicalName: 'All Purpose Cleaner', category: 'Household', emoji: '🧴', typicalPriceRange: [3.49, 5.99], unit: '32 oz', aliases: ['mr clean', 'lysol all purpose', 'multi surface cleaner'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-disinfecting-wipes', name: 'Disinfecting Wipes', canonicalName: 'Disinfecting Wipes', category: 'Household', emoji: '🧻', typicalPriceRange: [3.99, 6.99], unit: '75 count', aliases: ['clorox wipes', 'lysol wipes'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-dishwasher-detergent', name: 'Dishwasher Detergent', canonicalName: 'Dishwasher Detergent', category: 'Household', emoji: '🧺', typicalPriceRange: [5.99, 10.99], unit: '20 count pods', aliases: ['dishwasher pods', 'cascade pods'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-napkins', name: 'Napkins', canonicalName: 'Napkins', category: 'Household', emoji: '🧻', typicalPriceRange: [2.49, 4.99], unit: '200 count', aliases: ['paper napkins', 'dinner napkins'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-paper-plates', name: 'Paper Plates', canonicalName: 'Paper Plates', category: 'Household', emoji: '🍽️', typicalPriceRange: [3.99, 6.99], unit: '100 count', aliases: ['disposable plates'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Additional snacks
  { id: 'gc-trail-mix', name: 'Trail Mix', canonicalName: 'Trail Mix', category: 'Snacks', emoji: '🥜', typicalPriceRange: [4.99, 8.99], unit: '26 oz', aliases: ['nut trail mix', 'mountain trail mix'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-beef-jerky', name: 'Beef Jerky', canonicalName: 'Beef Jerky', category: 'Snacks', emoji: '🥩', typicalPriceRange: [5.99, 9.99], unit: '3 oz', aliases: ['jack links jerky', 'teriyaki jerky'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-fruit-snacks', name: 'Fruit Snacks', canonicalName: 'Fruit Snacks', category: 'Snacks', emoji: '🍇', typicalPriceRange: [2.49, 4.99], unit: '10 pouches', aliases: ['gummy fruit snacks', 'welchs fruit snacks'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-rice-cakes', name: 'Rice Cakes', canonicalName: 'Rice Cakes', category: 'Snacks', emoji: '🍘', typicalPriceRange: [2.49, 3.99], unit: '6.5 oz', aliases: ['quaker rice cakes', 'caramel rice cakes'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-goldfish', name: 'Goldfish Crackers', canonicalName: 'Goldfish Crackers', category: 'Snacks', emoji: '🐟', typicalPriceRange: [2.49, 4.49], unit: '6.6 oz', aliases: ['goldfish', 'cheddar goldfish'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-hummus', name: 'Hummus', canonicalName: 'Hummus', category: 'Snacks', emoji: '🥙', typicalPriceRange: [2.99, 4.99], unit: '10 oz', aliases: ['classic hummus', 'roasted red pepper hummus'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-pop-tarts', name: 'Pop Tarts', canonicalName: 'Pop Tarts', category: 'Snacks', emoji: '🧇', typicalPriceRange: [2.99, 4.99], unit: '8 count', aliases: ['toaster pastries', 'frosted pop tarts'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-dried-fruit', name: 'Dried Fruit', canonicalName: 'Dried Fruit', category: 'Snacks', emoji: '🍇', typicalPriceRange: [3.99, 6.99], unit: '6 oz', aliases: ['raisins', 'dried cranberries', 'dried mango'], stores: ['walmart', 'target', 'kroger', 'aldi', 'costco', 'publix', 'safeway', 'food-lion', 'bjs'] },

  // Additional bakery
  { id: 'gc-english-muffins', name: 'English Muffins', canonicalName: 'English Muffins', category: 'Bakery', emoji: '🥯', typicalPriceRange: [2.49, 3.99], unit: '6 count', aliases: ['thomas english muffins', 'whole wheat english muffins'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-pita-bread', name: 'Pita Bread', canonicalName: 'Pita Bread', category: 'Bakery', emoji: '🫓', typicalPriceRange: [1.99, 3.49], unit: '6 count', aliases: ['whole wheat pita', 'pita pockets'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-hot-dog-buns', name: 'Hot Dog Buns', canonicalName: 'Hot Dog Buns', category: 'Bakery', emoji: '🌭', typicalPriceRange: [1.99, 3.49], unit: '8 count', aliases: ['hotdog buns', 'frank buns'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-sourdough-bread', name: 'Sourdough Bread', canonicalName: 'Sourdough Bread', category: 'Bakery', emoji: '🍞', typicalPriceRange: [2.99, 4.99], unit: '1 loaf', aliases: ['sourdough loaf', 'artisan sourdough'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },
  { id: 'gc-cinnamon-rolls', name: 'Cinnamon Rolls', canonicalName: 'Cinnamon Rolls', category: 'Bakery', emoji: '🥐', typicalPriceRange: [3.49, 5.99], unit: '5 count', aliases: ['pillsbury cinnamon rolls', 'refrigerated cinnamon rolls'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion', 'bjs'] },
  { id: 'gc-pizza-dough', name: 'Pizza Dough', canonicalName: 'Pizza Dough', category: 'Bakery', emoji: '🍕', typicalPriceRange: [2.49, 4.49], unit: '16 oz', aliases: ['fresh pizza dough', 'refrigerated pizza dough'], stores: ['walmart', 'target', 'kroger', 'aldi', 'publix', 'safeway', 'food-lion'] },

];

export const POPULAR_ITEM_NAMES = [
  'Milk',
  'Eggs',
  'Bread',
  'Bananas',
  'Rice',
  'Water',
  'Chicken Breast',
  'Ground Beef',
  'Butter',
  'Coffee',
  'Paper Towels',
  'Cheddar Cheese',
];

const byCanonical = new Map<string, GroceryItem>();
const byAlias = new Map<string, GroceryItem>();

for (const item of GROCERY_CATALOG) {
  byCanonical.set(item.canonicalName.toLowerCase(), item);
  byAlias.set(item.canonicalName.toLowerCase(), item);
  for (const alias of item.aliases ?? []) {
    byAlias.set(alias.toLowerCase(), item);
  }
}

export function getGroceryItemByCanonical(canonicalName: string): GroceryItem | undefined {
  return byCanonical.get(canonicalName.trim().toLowerCase());
}

export function getGroceryItemByName(name: string): GroceryItem | undefined {
  const key = name.trim().toLowerCase();
  return byAlias.get(key) ?? byCanonical.get(key);
}

export function getGroceryTypicalPrice(item: GroceryItem): number {
  if (item.typicalPriceRange) {
    const [low, high] = item.typicalPriceRange;
    return Math.round(((low + high) / 2) * 100) / 100;
  }
  return 3.99;
}

export function getGroceryItemEmoji(canonicalName?: string, itemName?: string): string {
  if (canonicalName) {
    const match = getGroceryItemByCanonical(canonicalName);
    if (match) return match.emoji;
  }
  if (itemName) {
    const match = getGroceryItemByName(itemName);
    if (match) return match.emoji;
  }
  return '🛒';
}

export function getGroceryItemsByCategory(category: GroceryCategory): GroceryItem[] {
  return GROCERY_CATALOG.filter((item) => item.category === category);
}

export function getPopularGroceryItems(): GroceryItem[] {
  return POPULAR_ITEM_NAMES.map((name) => getGroceryItemByCanonical(name)).filter(
    (item): item is GroceryItem => item != null
  );
}

export function searchGroceryCatalog(query: string, limit = 12): GroceryItem[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const scored: Array<{ item: GroceryItem; score: number }> = [];
  for (const item of GROCERY_CATALOG) {
    const name = item.canonicalName.toLowerCase();
    const aliases = (item.aliases ?? []).map((a) => a.toLowerCase());
    let score = 0;
    if (name === trimmed) score = 100;
    else if (name.startsWith(trimmed)) score = 80;
    else if (name.includes(trimmed)) score = 60;
    else if (aliases.some((a) => a.startsWith(trimmed))) score = 50;
    else if (aliases.some((a) => a.includes(trimmed))) score = 40;
    else if (item.category.toLowerCase().includes(trimmed)) score = 20;
    else continue;
    scored.push({ item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.item.canonicalName.localeCompare(b.item.canonicalName))
    .slice(0, limit)
    .map((entry) => entry.item);
}
