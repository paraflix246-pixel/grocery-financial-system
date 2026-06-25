export type MealTemplate = {
  id: string;
  name: string;
  items: Array<{ name: string; category: string; quantity?: number }>;
};

export const MEAL_TEMPLATES: MealTemplate[] = [
  {
    id: 'tacos',
    name: 'Tacos',
    items: [
      { name: 'Ground Beef', category: 'Meat', quantity: 1 },
      { name: 'Shredded Cheese', category: 'Dairy', quantity: 1 },
      { name: 'Tortillas', category: 'Bakery', quantity: 1 },
      { name: 'Lettuce', category: 'Produce', quantity: 1 },
      { name: 'Salsa', category: 'Pantry', quantity: 1 },
    ],
  },
  {
    id: 'pasta',
    name: 'Pasta Night',
    items: [
      { name: 'Spaghetti', category: 'Pantry', quantity: 1 },
      { name: 'Marinara Sauce', category: 'Pantry', quantity: 1 },
      { name: 'Parmesan Cheese', category: 'Dairy', quantity: 1 },
      { name: 'Garlic Bread', category: 'Bakery', quantity: 1 },
    ],
  },
  {
    id: 'breakfast',
    name: 'Breakfast Basics',
    items: [
      { name: 'Eggs', category: 'Dairy', quantity: 1 },
      { name: 'Bacon', category: 'Meat', quantity: 1 },
      { name: 'Orange Juice', category: 'Beverages', quantity: 1 },
      { name: 'Bread', category: 'Bakery', quantity: 1 },
    ],
  },
];

export function getMealTemplate(id: string): MealTemplate | undefined {
  return MEAL_TEMPLATES.find((m) => m.id === id);
}
