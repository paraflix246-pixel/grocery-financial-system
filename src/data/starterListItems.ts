export type StarterListItem = {
  name: string;
  category: string;
  quantity: number;
  quantityLabel: string;
  expectedPrice: number;
  storePreference?: string;
};

export const STARTER_CATEGORIES = ['All', 'Produce', 'Dairy', 'Pantry', 'Household', 'Snacks', 'Beverages'];

export const STARTER_LIST_ITEMS: StarterListItem[] = [
  { name: 'Milk', category: 'Dairy', quantity: 1, quantityLabel: '1 gallon', expectedPrice: 4.29 },
  { name: 'Eggs', category: 'Dairy', quantity: 1, quantityLabel: '1 dozen', expectedPrice: 3.49 },
  { name: 'Cheddar Cheese', category: 'Dairy', quantity: 1, quantityLabel: '8 oz', expectedPrice: 3.99 },
  { name: 'Bananas', category: 'Produce', quantity: 1, quantityLabel: '1 bunch', expectedPrice: 2.19 },
  { name: 'Apples', category: 'Produce', quantity: 1, quantityLabel: '1 bag', expectedPrice: 4.5 },
  { name: 'Bread', category: 'Pantry', quantity: 1, quantityLabel: '1 loaf', expectedPrice: 2.99 },
  { name: 'Rice', category: 'Pantry', quantity: 1, quantityLabel: '2 lb bag', expectedPrice: 3.49 },
  { name: 'Pasta', category: 'Pantry', quantity: 1, quantityLabel: '1 box', expectedPrice: 1.89 },
  { name: 'Paper Towels', category: 'Household', quantity: 1, quantityLabel: '1 pack', expectedPrice: 5.97 },
  { name: 'Dish Soap', category: 'Household', quantity: 1, quantityLabel: '1 bottle', expectedPrice: 3.29 },
  { name: 'Chips', category: 'Snacks', quantity: 1, quantityLabel: '1 bag', expectedPrice: 3.99 },
  { name: 'Crackers', category: 'Snacks', quantity: 1, quantityLabel: '1 box', expectedPrice: 3.49 },
  { name: 'Water', category: 'Beverages', quantity: 1, quantityLabel: '24 pack', expectedPrice: 5.49 },
  { name: 'Juice', category: 'Beverages', quantity: 1, quantityLabel: '1 bottle', expectedPrice: 3.99 },
];

export function getQuantityLabel(name: string, quantity: number): string {
  const match = STARTER_LIST_ITEMS.find(
    (item) => item.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (match) return match.quantityLabel;
  if (quantity === 1) return '1 unit';
  return `${quantity} units`;
}
