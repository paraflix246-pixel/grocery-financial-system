export type MarketplaceDealSource = 'kroger-api' | 'serpapi' | 'store-weekly-ad';

export type MarketplaceDeal = {
  id: string;
  title: string;
  store: string;
  discountLabel: string;
  category: string;
  emoji: string;
  url: string;
  source: MarketplaceDealSource;
  promoPrice?: number;
  regularPrice?: number;
};

export type MarketplaceSourceStatus = {
  available: boolean;
  count: number;
  error?: string;
};

export type MarketplaceFetchResult = {
  deals: MarketplaceDeal[];
  sources: {
    kroger: MarketplaceSourceStatus;
    serpapi: MarketplaceSourceStatus;
    weeklyAds: { count: number };
  };
  statusMessage: string;
};
