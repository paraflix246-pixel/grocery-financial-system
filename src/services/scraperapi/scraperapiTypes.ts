export type WalmartSearchItem = {
  title: string;
  price: number;
};

export type ScraperApiWalmartSearchResult = {
  items: WalmartSearchItem[];
  error?: string;
};
