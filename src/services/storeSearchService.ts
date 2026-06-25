import type { StoreDefinition } from '@/src/data/stores';
import { getAllStores } from '@/src/services/storeService';
import {
  buildRecentStoreEntries,
  type RecentStoreEntry,
} from '@/src/utils/storeSearchLogic';

export type { StoreSearchResult } from '@/src/utils/storeSearchLogic';
export {
  buildRecentStoreEntries,
  searchStoreSuggestions,
  storeSearchSelectionToDraft,
} from '@/src/utils/storeSearchLogic';

export async function loadStoreSearchData(): Promise<{
  stores: StoreDefinition[];
  recentStores: RecentStoreEntry[];
}> {
  const { getReceipts } = await import('@/src/services/storageService');
  const [stores, receipts] = await Promise.all([getAllStores(), getReceipts()]);
  return {
    stores,
    recentStores: buildRecentStoreEntries(receipts),
  };
}
