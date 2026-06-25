import type { StoreDefinition } from '@/src/data/stores';
import type { GroceryList, StorePreference } from '@/src/models/types';

/** Store-bound shopping list for a retailer, excluding the cart-comparison source list. */
export function findDedicatedStoreBoundList(
  lists: GroceryList[],
  store: Pick<StoreDefinition, 'id' | 'name'>,
  options?: { excludeListId?: string }
): GroceryList | undefined {
  const excludeListId = options?.excludeListId;
  const storeNameLower = store.name.toLowerCase();

  return lists.find(
    (list) =>
      list.layoutMode === 'store' &&
      list.id !== excludeListId &&
      (list.storeId === store.id || list.storeName?.toLowerCase() === storeNameLower)
  );
}

export function applyStorePreferences(
  stores: StoreDefinition[],
  preferences: StorePreference[]
): StoreDefinition[] {
  const prefMap = new Map(preferences.map((pref) => [pref.storeId, pref]));
  return stores.map((store) => {
    const pref = prefMap.get(store.id);
    if (!pref) return store;
    return {
      ...store,
      isFavorite: pref.isFavorite,
      region: pref.region ?? store.region,
    };
  });
}

export function sortStoresForDisplay(stores: StoreDefinition[]): StoreDefinition[] {
  return [...stores].sort((a, b) => {
    const favoriteDiff = Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite));
    if (favoriteDiff !== 0) return favoriteDiff;
    return a.name.localeCompare(b.name);
  });
}
