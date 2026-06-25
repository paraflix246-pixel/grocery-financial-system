export type StoreLayoutSection = {
  id: string;
  label: string;
  categories: string[];
};

export type StoreLayout = {
  storeId: string;
  storeName: string;
  sections: StoreLayoutSection[];
};

/** Curated walk order — category names map to list item categories. */
export const STORE_LAYOUTS: StoreLayout[] = [
  {
    storeId: 'walmart',
    storeName: 'Walmart',
    sections: [
      { id: 'aisle-produce', label: 'Produce', categories: ['Produce'] },
      { id: 'aisle-dairy', label: 'Dairy & Eggs', categories: ['Dairy'] },
      { id: 'aisle-meat', label: 'Meat & Seafood', categories: ['Meat'] },
      { id: 'aisle-bakery', label: 'Bakery', categories: ['Bakery'] },
      { id: 'aisle-frozen', label: 'Frozen', categories: ['Frozen'] },
      { id: 'aisle-pantry', label: 'Pantry', categories: ['Pantry', 'Snacks'] },
      { id: 'aisle-beverages', label: 'Beverages', categories: ['Beverages'] },
      { id: 'aisle-household', label: 'Household', categories: ['Household'] },
    ],
  },
  {
    storeId: 'costco',
    storeName: 'Costco',
    sections: [
      { id: 'produce', label: 'Produce', categories: ['Produce'] },
      { id: 'meat', label: 'Meat', categories: ['Meat'] },
      { id: 'dairy', label: 'Dairy', categories: ['Dairy'] },
      { id: 'frozen', label: 'Frozen', categories: ['Frozen'] },
      { id: 'pantry', label: 'Pantry & Snacks', categories: ['Pantry', 'Snacks'] },
      { id: 'beverages', label: 'Beverages', categories: ['Beverages'] },
      { id: 'household', label: 'Household', categories: ['Household'] },
    ],
  },
  {
    storeId: 'trader-joes',
    storeName: "Trader Joe's",
    sections: [
      { id: 'produce', label: 'Produce', categories: ['Produce'] },
      { id: 'dairy', label: 'Dairy', categories: ['Dairy'] },
      { id: 'frozen', label: 'Frozen', categories: ['Frozen'] },
      { id: 'pantry', label: 'Pantry', categories: ['Pantry', 'Snacks', 'Bakery'] },
      { id: 'beverages', label: 'Beverages', categories: ['Beverages'] },
    ],
  },
];

export function getStoreLayoutForName(storeName?: string | null): StoreLayout | undefined {
  if (!storeName?.trim()) return undefined;
  const key = storeName.trim().toLowerCase();
  return STORE_LAYOUTS.find(
    (layout) =>
      layout.storeName.toLowerCase() === key ||
      layout.storeId === key ||
      key.includes(layout.storeId.replace(/-/g, ' '))
  );
}

export function groupItemsByStoreLayout<T extends { category: string }>(
  items: T[],
  layout: StoreLayout
): Array<{ sectionLabel: string; items: T[] }> {
  const assigned = new Set<T>();
  const groups: Array<{ sectionLabel: string; items: T[] }> = [];

  for (const section of layout.sections) {
    const sectionItems = items.filter(
      (item) =>
        !assigned.has(item) &&
        section.categories.includes(item.category || 'Other')
    );
    for (const item of sectionItems) assigned.add(item);
    if (sectionItems.length > 0) {
      groups.push({ sectionLabel: section.label, items: sectionItems });
    }
  }

  const remaining = items.filter((item) => !assigned.has(item));
  if (remaining.length > 0) {
    groups.push({ sectionLabel: 'Other', items: remaining });
  }

  return groups;
}
