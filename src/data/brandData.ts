export type BrandOwnershipEntry = {
  brand: string;
  owner: string;
  relatedBrands: string[];
  category?: string;
  /** Common product names that map to this brand (local catalog; future: Open Food Facts). */
  productAliases?: string[];
};

export const BRAND_OWNERSHIP_DATA: BrandOwnershipEntry[] = [
  {
    brand: 'Oreo',
    owner: 'Mondelez International',
    relatedBrands: ['Ritz', 'Chips Ahoy', 'Cadbury', 'Trident'],
    category: 'Snacks',
    productAliases: ['oreo cookies', 'double stuf oreo', 'golden oreo', 'oreo thins'],
  },
  {
    brand: 'Cheerios',
    owner: 'General Mills',
    relatedBrands: ['Nature Valley', 'Betty Crocker', 'Pillsbury', 'Annie\'s'],
    category: 'Cereal',
    productAliases: ['honey nut cheerios', 'cheerios cereal', 'multigrain cheerios', 'yoplait yogurt'],
  },
  {
    brand: 'Kraft',
    owner: 'Kraft Heinz',
    relatedBrands: ['Heinz', 'Philadelphia', 'Oscar Mayer', 'Capri Sun'],
    category: 'Dairy & Pantry',
    productAliases: ['kraft mac and cheese', 'kraft singles', 'philadelphia cream cheese', 'oscar mayer hot dogs'],
  },
  {
    brand: 'Tide',
    owner: 'Procter & Gamble',
    relatedBrands: ['Pampers', 'Gillette', 'Crest', 'Bounty'],
    category: 'Household',
    productAliases: ['tide detergent', 'tide pods', 'tide liquid', 'tide laundry detergent'],
  },
  {
    brand: 'Coca-Cola',
    owner: 'The Coca-Cola Company',
    relatedBrands: ['Sprite', 'Fanta', 'Minute Maid', 'Dasani'],
    category: 'Beverages',
    productAliases: ['coke', 'diet coke', 'coca cola classic', 'sprite soda'],
  },
  {
    brand: 'Great Value',
    owner: 'Walmart (Store Brand)',
    relatedBrands: ['Equate', 'Sam\'s Choice'],
    category: 'Store Brand',
    productAliases: ['great value milk', 'great value bread', 'walmart brand'],
  },
  {
    brand: 'Kirkland Signature',
    owner: 'Costco (Store Brand)',
    relatedBrands: ['Costco Wholesale'],
    category: 'Store Brand',
    productAliases: ['kirkland', 'costco brand', 'kirkland organic'],
  },
];

export function lookupBrandOwnership(query: string): BrandOwnershipEntry | undefined {
  const key = query.trim().toLowerCase();
  if (!key) return undefined;
  return BRAND_OWNERSHIP_DATA.find(
    (entry) =>
      entry.brand.toLowerCase() === key ||
      entry.brand.toLowerCase().includes(key) ||
      key.includes(entry.brand.toLowerCase())
  );
}

export function searchBrandOwnership(query: string): BrandOwnershipEntry[] {
  const key = query.trim().toLowerCase();
  if (!key) return BRAND_OWNERSHIP_DATA.slice(0, 6);
  return BRAND_OWNERSHIP_DATA.filter(
    (entry) =>
      entry.brand.toLowerCase().includes(key) ||
      entry.owner.toLowerCase().includes(key) ||
      entry.relatedBrands.some((b) => b.toLowerCase().includes(key))
  );
}
