import type { GroceryList, ListItem } from '@/src/models/types';
import { createTimedCache } from '@/src/utils/timedCache';

export type ResolvedComparisonList = {
  list: GroceryList;
  items: ListItem[];
  source: 'list' | 'watchlist' | 'receipt' | 'starter';
};

export const comparisonListCache = createTimedCache<ResolvedComparisonList | null>(30_000);

export function invalidateComparisonListCache(): void {
  comparisonListCache.clear();
}
