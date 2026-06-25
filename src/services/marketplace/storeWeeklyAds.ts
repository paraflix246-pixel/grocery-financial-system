import type { MarketplaceDeal } from '@/src/services/marketplace/marketplaceTypes';

/** Official store deal / weekly-ad pages — real public URLs, not fabricated prices. */
export const STORE_WEEKLY_AD_DEALS: MarketplaceDeal[] = [
  {
    id: 'weekly-aldi',
    title: 'Aldi Weekly Specials',
    store: 'Aldi',
    discountLabel: 'Weekly ad',
    category: 'All departments',
    emoji: '🥬',
    url: 'https://www.aldi.us/weekly-specials/',
    source: 'store-weekly-ad',
  },
  {
    id: 'weekly-walmart',
    title: 'Walmart Grocery Deals',
    store: 'Walmart',
    discountLabel: 'Store deals',
    category: 'All departments',
    emoji: '🛒',
    url: 'https://www.walmart.com/shop/deals/food',
    source: 'store-weekly-ad',
  },
  {
    id: 'weekly-target',
    title: 'Target Grocery Deals',
    store: 'Target',
    discountLabel: 'Weekly deals',
    category: 'All departments',
    emoji: '🎯',
    url: 'https://www.target.com/c/grocery-deals/-/N-4nav',
    source: 'store-weekly-ad',
  },
  {
    id: 'weekly-costco',
    title: 'Costco Warehouse Offers',
    store: 'Costco',
    discountLabel: 'Warehouse offers',
    category: 'All departments',
    emoji: '🧻',
    url: 'https://www.costco.com/warehouse-offers.html',
    source: 'store-weekly-ad',
  },
  {
    id: 'weekly-kroger',
    title: 'Kroger Digital Coupons & Savings',
    store: 'Kroger',
    discountLabel: 'Coupons & savings',
    category: 'All departments',
    emoji: '🍿',
    url: 'https://www.kroger.com/savings/cl/coupons/',
    source: 'store-weekly-ad',
  },
];

export function weeklyAdDealsForStores(stores: string[], limit = 5): MarketplaceDeal[] {
  const normalized = new Set(stores.map((store) => store.trim().toLowerCase()));
  const missing = STORE_WEEKLY_AD_DEALS.filter(
    (deal) => !normalized.has(deal.store.toLowerCase())
  );
  return missing.slice(0, limit);
}
