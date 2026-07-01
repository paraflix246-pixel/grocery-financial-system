import { create } from 'zustand';

import type { GroceryList, ListItem } from '@/src/models/types';
import {
  createList,
  deleteList,
  getActiveList,
  getAllLists,
  getListItems,
  markListCompleted,
  setActiveList,
  updateList,
  patchList,
} from '@/src/services/storageService';
import type { UpdateListPatch } from '@/src/services/storageService';

type ListStore = {
  lists: GroceryList[];
  activeListId: string | null;
  itemsByList: Record<string, ListItem[]>;
  loading: boolean;
  loadLists: () => Promise<void>;
  loadListItems: (listId: string) => Promise<ListItem[]>;
  addList: (name: string, options?: import('@/src/services/storageService').CreateListOptions) => Promise<GroceryList>;
  removeList: (id: string) => Promise<void>;
  renameList: (id: string, name: string) => Promise<void>;
  patchListMeta: (id: string, patch: UpdateListPatch) => Promise<void>;
  activateList: (id: string) => Promise<void>;
  completeList: (id: string) => Promise<boolean>;
  refreshItems: (listId: string) => Promise<void>;
  patchListItem: (listId: string, itemId: string, patch: Partial<Omit<ListItem, 'id' | 'listId'>>) => void;
};

function listsEqual(a: GroceryList[], b: GroceryList[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (list, index) =>
        list.id === b[index]?.id &&
        list.name === b[index]?.name &&
        list.updatedAt === b[index]?.updatedAt &&
        list.isActive === b[index]?.isActive &&
        list.completedAt === b[index]?.completedAt
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
      item.sortOrder === other?.sortOrder &&
      item.storePreference === other?.storePreference
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

  addList: async (name, options) => {
    const list = await createList(name, options);
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

  renameList: async (id, name) => {
    await updateList(id, name);
    await get().loadLists();
  },

  patchListMeta: async (id, patch) => {
    await patchList(id, patch);
    await get().loadLists();
  },

  activateList: async (id) => {
    await setActiveList(id);
    set({ activeListId: id });
    await get().loadLists();
  },

  completeList: async (id) => {
    const wasActive = get().activeListId === id;
    const completedAt = new Date().toISOString();
    await markListCompleted(id);
    set((s) => ({
      activeListId: s.activeListId === id ? null : s.activeListId,
      lists: s.lists.map((list) =>
        list.id === id ? { ...list, isActive: false, completedAt } : list
      ),
    }));
    await get().loadLists();
    return wasActive;
  },

  refreshItems: async (listId) => {
    await get().loadListItems(listId);
  },

  patchListItem: (listId, itemId, patch) => {
    set((state) => {
      const items = state.itemsByList[listId];
      if (!items) return state;
      const nextItems = items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      );
      return { itemsByList: { ...state.itemsByList, [listId]: nextItems } };
    });
  },
}));
