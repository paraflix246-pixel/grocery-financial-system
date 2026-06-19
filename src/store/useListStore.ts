import { create } from 'zustand';

import type { GroceryList, ListItem } from '@/src/models/types';
import {
  createList,
  deleteList,
  getActiveList,
  getAllLists,
  getListItems,
  setActiveList,
} from '@/src/services/storageService';

type ListStore = {
  lists: GroceryList[];
  activeListId: string | null;
  itemsByList: Record<string, ListItem[]>;
  loading: boolean;
  loadLists: () => Promise<void>;
  loadListItems: (listId: string) => Promise<ListItem[]>;
  addList: (name: string) => Promise<GroceryList>;
  removeList: (id: string) => Promise<void>;
  activateList: (id: string) => Promise<void>;
  refreshItems: (listId: string) => Promise<void>;
};

function listsEqual(a: GroceryList[], b: GroceryList[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (list, index) =>
        list.id === b[index]?.id &&
        list.name === b[index]?.name &&
        list.updatedAt === b[index]?.updatedAt &&
        list.isActive === b[index]?.isActive
    )
  );
}

function itemsEqual(a: ListItem[], b: ListItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      item.id === other?.id &&
      item.name === other?.name &&
      item.expectedPrice === other?.expectedPrice &&
      item.quantity === other?.quantity &&
      item.category === other?.category &&
      item.sortOrder === other?.sortOrder
    );
  });
}

let loadListsInFlight: Promise<void> | null = null;

export const useListStore = create<ListStore>((set, get) => ({
  lists: [],
  activeListId: null,
  itemsByList: {},
  loading: false,

  loadLists: async () => {
    if (loadListsInFlight) return loadListsInFlight;

    loadListsInFlight = (async () => {
      const isInitialLoad = get().lists.length === 0;
      if (isInitialLoad) {
        set({ loading: true });
      }

      const lists = await getAllLists();
      const active = await getActiveList();
      const activeListId = active?.id ?? null;

      set((state) => {
        const sameLists = listsEqual(state.lists, lists);
        if (sameLists && state.activeListId === activeListId) {
          return state.loading ? { loading: false } : {};
        }
        return { lists, activeListId, loading: false };
      });
    })().finally(() => {
      loadListsInFlight = null;
    });

    return loadListsInFlight;
  },

  loadListItems: async (listId) => {
    const items = await getListItems(listId);
    const existing = get().itemsByList[listId];
    if (existing && itemsEqual(existing, items)) {
      return items;
    }
    set((s) => ({ itemsByList: { ...s.itemsByList, [listId]: items } }));
    return items;
  },

  addList: async (name) => {
    const list = await createList(name);
    await get().loadLists();
    return list;
  },

  removeList: async (id) => {
    await deleteList(id);
    set((s) => {
      const { [id]: _removed, ...itemsByList } = s.itemsByList;
      return {
        itemsByList,
        lists: s.lists.filter((list) => list.id !== id),
        activeListId: s.activeListId === id ? null : s.activeListId,
      };
    });
    await get().loadLists();
  },

  activateList: async (id) => {
    await setActiveList(id);
    set({ activeListId: id });
    await get().loadLists();
  },

  refreshItems: async (listId) => {
    await get().loadListItems(listId);
  },
}));
