import AsyncStorage from '@react-native-async-storage/async-storage';

import type { StoreDefinition } from '@/src/data/stores';
import { SCHEMA_VERSION } from '@/src/models/schema';
import type {
  AppSettings,
  BudgetSettings,
  CategoryLimits,
  Comparison,
  ComparisonItem,
  GroceryList,
  ListItem,
  Receipt,
  ReceiptFilters,
  ReceiptItem,
} from '@/src/models/types';
import { generateId } from '@/src/utils/id';
import { defaultCategoryLimits } from '@/src/utils/budgetDefaults';
import {
  isDuplicateReceiptTotal,
  normalizeStoreForDuplicate,
} from '@/src/utils/duplicateReceipt';

const STORAGE_KEY = '@grocery_financial_web_data_v1';

type WebStore = {
  schemaVersion: number;
  lists: GroceryList[];
  listItems: ListItem[];
  receipts: Receipt[];
  receiptItems: ReceiptItem[];
  comparisons: Comparison[];
  comparisonItems: ComparisonItem[];
  budgetSettings: BudgetSettings;
  appSettings: AppSettings;
  customStores: StoreDefinition[];
};

let store: WebStore | null = null;
let loadPromise: Promise<void> | null = null;

async function persist(): Promise<void> {
  if (!store) return;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

async function loadStore(): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as Partial<WebStore>;
    const receipts = parsed.receipts ?? [];
    const receiptItems = parsed.receiptItems ?? [];
    const migratedReceiptItems = receipts.flatMap((receipt) =>
      (receipt.items ?? []).map((item) => ({
        ...item,
        id: item.id || generateId(),
        receiptId: receipt.id,
      }))
    );
    const budgetSettings: BudgetSettings =
      parsed.budgetSettings ?? {
        id: generateId(),
        weeklyBudget: 150,
        alertThreshold: 0.9,
        updatedAt: new Date().toISOString(),
      };
    if (!budgetSettings.categoryLimits) {
      budgetSettings.categoryLimits = defaultCategoryLimits(budgetSettings.weeklyBudget * 4);
    }
    store = {
      schemaVersion: SCHEMA_VERSION,
      lists: parsed.lists ?? [],
      listItems: parsed.listItems ?? [],
      receipts: receipts.map(({ items: _items, ...receipt }) => receipt),
      receiptItems: receiptItems.length > 0 ? receiptItems : migratedReceiptItems,
      comparisons: parsed.comparisons ?? [],
      comparisonItems: parsed.comparisonItems ?? [],
      budgetSettings,
      appSettings:
        parsed.appSettings ?? {
          id: generateId(),
          displayName: '',
          notifyPriceAlerts: true,
          notifyBudgetAlerts: true,
          updatedAt: new Date().toISOString(),
        },
      customStores: parsed.customStores ?? [],
    };
    return;
  }

  const now = new Date().toISOString();
  store = {
    schemaVersion: SCHEMA_VERSION,
    lists: [],
    listItems: [],
    receipts: [],
    receiptItems: [],
    comparisons: [],
    comparisonItems: [],
    budgetSettings: {
      id: generateId(),
      weeklyBudget: 150,
      alertThreshold: 0.9,
      categoryLimits: defaultCategoryLimits(600),
      updatedAt: now,
    },
    appSettings: {
      id: generateId(),
      displayName: '',
      notifyPriceAlerts: true,
      notifyBudgetAlerts: true,
      updatedAt: now,
    },
    customStores: [],
  };
  await persist();
}

async function ensureLoaded(): Promise<WebStore> {
  if (store) return store;
  if (!loadPromise) {
    loadPromise = loadStore().catch((error) => {
      loadPromise = null;
      throw error;
    });
  }
  await loadPromise;
  return store!;
}

export async function initStorage(): Promise<void> {
  await ensureLoaded();
}

// --- Grocery Lists ---

export async function getAllLists(): Promise<GroceryList[]> {
  const data = await ensureLoaded();
  return [...data.lists].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getListById(id: string): Promise<GroceryList | null> {
  const data = await ensureLoaded();
  return data.lists.find((list) => list.id === id) ?? null;
}

export async function getActiveList(): Promise<GroceryList | null> {
  const data = await ensureLoaded();
  return data.lists.find((list) => list.isActive) ?? null;
}

export async function createList(name: string): Promise<GroceryList> {
  const data = await ensureLoaded();
  const now = new Date().toISOString();
  const id = generateId();
  const isFirst = data.lists.length === 0;
  const list: GroceryList = {
    id,
    name,
    isActive: isFirst,
    createdAt: now,
    updatedAt: now,
  };
  data.lists.push(list);
  await persist();
  return list;
}

export async function updateList(id: string, name: string): Promise<void> {
  const data = await ensureLoaded();
  const list = data.lists.find((entry) => entry.id === id);
  if (!list) return;
  list.name = name;
  list.updatedAt = new Date().toISOString();
  await persist();
}

export async function deleteList(id: string): Promise<void> {
  const data = await ensureLoaded();
  data.lists = data.lists.filter((list) => list.id !== id);
  data.listItems = data.listItems.filter((item) => item.listId !== id);
  data.comparisons = data.comparisons.filter((comparison) => comparison.listId !== id);
  await persist();
}

export async function setActiveList(id: string): Promise<void> {
  const data = await ensureLoaded();
  const now = new Date().toISOString();
  for (const list of data.lists) {
    list.isActive = list.id === id;
    if (list.id === id) list.updatedAt = now;
  }
  await persist();
}

// --- List Items ---

export async function getListItems(listId: string): Promise<ListItem[]> {
  const data = await ensureLoaded();
  return data.listItems
    .filter((item) => item.listId === listId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function createListItem(
  listId: string,
  itemData: Omit<ListItem, 'id' | 'listId' | 'sortOrder'> & { sortOrder?: number }
): Promise<ListItem> {
  const data = await ensureLoaded();
  const id = generateId();
  const existing = data.listItems.filter((item) => item.listId === listId);
  const sortOrder = itemData.sortOrder ?? existing.length;
  const item: ListItem = {
    id,
    listId,
    name: itemData.name,
    expectedPrice: itemData.expectedPrice,
    quantity: itemData.quantity,
    category: itemData.category,
    storePreference: itemData.storePreference,
    sortOrder,
  };
  data.listItems.push(item);
  const list = data.lists.find((entry) => entry.id === listId);
  if (list) list.updatedAt = new Date().toISOString();
  await persist();
  return item;
}

export async function updateListItem(
  id: string,
  itemData: Partial<Omit<ListItem, 'id' | 'listId'>>
): Promise<void> {
  const data = await ensureLoaded();
  const item = data.listItems.find((entry) => entry.id === id);
  if (!item) return;
  Object.assign(item, {
    name: itemData.name ?? item.name,
    expectedPrice: itemData.expectedPrice ?? item.expectedPrice,
    quantity: itemData.quantity ?? item.quantity,
    category: itemData.category ?? item.category,
    storePreference:
      itemData.storePreference !== undefined ? itemData.storePreference : item.storePreference,
    sortOrder: itemData.sortOrder ?? item.sortOrder,
  });
  const list = data.lists.find((entry) => entry.id === item.listId);
  if (list) list.updatedAt = new Date().toISOString();
  await persist();
}

export async function deleteListItem(id: string): Promise<void> {
  const data = await ensureLoaded();
  const item = data.listItems.find((entry) => entry.id === id);
  data.listItems = data.listItems.filter((entry) => entry.id !== id);
  if (item) {
    const list = data.lists.find((entry) => entry.id === item.listId);
    if (list) list.updatedAt = new Date().toISOString();
  }
  await persist();
}

// --- Receipts ---

export async function getReceipts(filters?: ReceiptFilters): Promise<Receipt[]> {
  const data = await ensureLoaded();
  let receipts = [...data.receipts];
  if (filters?.storeName) {
    const needle = filters.storeName.toLowerCase();
    receipts = receipts.filter((receipt) => receipt.storeName.toLowerCase().includes(needle));
  }
  if (filters?.startDate) {
    receipts = receipts.filter((receipt) => receipt.date >= filters.startDate!);
  }
  if (filters?.endDate) {
    receipts = receipts.filter((receipt) => receipt.date <= filters.endDate!);
  }
  return receipts.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
  });
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  const data = await ensureLoaded();
  const receipt = data.receipts.find((entry) => entry.id === id);
  if (!receipt) return null;
  return {
    ...receipt,
    items: await getReceiptItems(id),
  };
}

export async function getReceiptItems(receiptId: string): Promise<ReceiptItem[]> {
  const data = await ensureLoaded();
  return data.receiptItems.filter((item) => item.receiptId === receiptId);
}

export async function findDuplicateReceipt(
  storeName: string,
  date: string,
  total: number,
  excludeId?: string
): Promise<Receipt | null> {
  const data = await ensureLoaded();
  const normalizedStore = normalizeStoreForDuplicate(storeName);
  for (const receipt of data.receipts) {
    if (excludeId && receipt.id === excludeId) continue;
    if (receipt.date !== date) continue;
    if (normalizeStoreForDuplicate(receipt.storeName) !== normalizedStore) continue;
    if (isDuplicateReceiptTotal(receipt.total, total)) {
      return receipt;
    }
  }
  return null;
}

export async function saveReceipt(
  receipt: Omit<Receipt, 'createdAt' | 'updatedAt' | 'items'> & {
    items: Array<Omit<ReceiptItem, 'id' | 'receiptId'>>;
  }
): Promise<Receipt> {
  const data = await ensureLoaded();
  const now = new Date().toISOString();
  const id = receipt.id || generateId();
  const { items, ...receiptFields } = receipt;
  const saved: Receipt = {
    ...receiptFields,
    id,
    createdAt: now,
    updatedAt: now,
  };
  data.receipts.push(saved);
  const savedItems = items.map((item) => ({
    ...item,
    id: generateId(),
    receiptId: id,
  }));
  data.receiptItems.push(...savedItems);
  await persist();
  const { registerStoreFromReceipt } = await import('@/src/services/storeService');
  await registerStoreFromReceipt(receipt.storeName);
  return { ...saved, items: savedItems };
}

export async function updateReceipt(
  id: string,
  receipt: Partial<Omit<Receipt, 'items'>> & { items?: Array<Omit<ReceiptItem, 'receiptId'>> }
): Promise<void> {
  const data = await ensureLoaded();
  const existing = await getReceiptById(id);
  if (!existing) return;

  const now = new Date().toISOString();
  const index = data.receipts.findIndex((entry) => entry.id === id);
  data.receipts[index] = {
    ...existing,
    storeName: receipt.storeName ?? existing.storeName,
    date: receipt.date ?? existing.date,
    subtotal: receipt.subtotal ?? existing.subtotal,
    tax: receipt.tax ?? existing.tax,
    total: receipt.total ?? existing.total,
    imageUri: receipt.imageUri ?? existing.imageUri,
    linkedListId: receipt.linkedListId !== undefined ? receipt.linkedListId : existing.linkedListId,
    userCorrected: receipt.userCorrected ?? existing.userCorrected,
    updatedAt: now,
  };

  if (receipt.items) {
    data.receiptItems = data.receiptItems.filter((item) => item.receiptId !== id);
    data.receiptItems.push(
      ...receipt.items.map((item) => ({
        ...item,
        id: item.id || generateId(),
        receiptId: id,
      }))
    );
  }
  const storeName = receipt.storeName ?? existing.storeName;
  const { registerStoreFromReceipt } = await import('@/src/services/storeService');
  await registerStoreFromReceipt(storeName);
  await persist();
}

export async function deleteReceipt(id: string): Promise<void> {
  const data = await ensureLoaded();
  const comparisonIds = data.comparisons
    .filter((comparison) => comparison.receiptId === id)
    .map((comparison) => comparison.id);
  data.comparisonItems = data.comparisonItems.filter(
    (item) => !comparisonIds.includes(item.comparisonId)
  );
  data.comparisons = data.comparisons.filter((comparison) => comparison.receiptId !== id);
  data.receiptItems = data.receiptItems.filter((item) => item.receiptId !== id);
  data.receipts = data.receipts.filter((receipt) => receipt.id !== id);
  await persist();
}

export async function linkReceiptToList(receiptId: string, listId: string): Promise<void> {
  const data = await ensureLoaded();
  const receipt = data.receipts.find((entry) => entry.id === receiptId);
  if (!receipt) return;
  receipt.linkedListId = listId;
  receipt.updatedAt = new Date().toISOString();
  await persist();
}

// --- Comparisons ---

export async function saveComparison(
  comparison: Omit<Comparison, 'id' | 'createdAt'>,
  items: Array<Omit<ComparisonItem, 'id' | 'comparisonId'>>
): Promise<Comparison> {
  const data = await ensureLoaded();
  const id = generateId();
  const now = new Date().toISOString();
  const saved: Comparison = { ...comparison, id, createdAt: now };
  data.comparisons.push(saved);
  data.comparisonItems.push(
    ...items.map((item) => ({
      ...item,
      id: generateId(),
      comparisonId: id,
    }))
  );
  await persist();
  return saved;
}

export async function getComparisonByReceiptId(receiptId: string): Promise<Comparison | null> {
  const data = await ensureLoaded();
  return data.comparisons.find((comparison) => comparison.receiptId === receiptId) ?? null;
}

export async function getComparisonItems(comparisonId: string): Promise<ComparisonItem[]> {
  const data = await ensureLoaded();
  return data.comparisonItems.filter((item) => item.comparisonId === comparisonId);
}

export async function getLatestComparison(): Promise<(Comparison & { items: ComparisonItem[] }) | null> {
  const data = await ensureLoaded();
  const latest = [...data.comparisons].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!latest) return null;
  const items = await getComparisonItems(latest.id);
  return { ...latest, items };
}

export async function deleteComparisonByReceiptId(receiptId: string): Promise<void> {
  const data = await ensureLoaded();
  const comparison = await getComparisonByReceiptId(receiptId);
  if (!comparison) return;
  data.comparisonItems = data.comparisonItems.filter(
    (item) => item.comparisonId !== comparison.id
  );
  data.comparisons = data.comparisons.filter((entry) => entry.id !== comparison.id);
  await persist();
}

// --- Budget ---

export async function getBudgetSettings(): Promise<BudgetSettings> {
  const data = await ensureLoaded();
  return { ...data.budgetSettings };
}

export async function updateBudgetSettings(
  weeklyBudget: number,
  alertThreshold: number,
  categoryLimits?: CategoryLimits
): Promise<BudgetSettings> {
  const data = await ensureLoaded();
  const now = new Date().toISOString();
  data.budgetSettings = {
    ...data.budgetSettings,
    weeklyBudget,
    alertThreshold,
    categoryLimits: categoryLimits ?? data.budgetSettings.categoryLimits,
    updatedAt: now,
  };
  await persist();
  return { ...data.budgetSettings };
}

export async function getAppSettings(): Promise<AppSettings> {
  const data = await ensureLoaded();
  return { ...data.appSettings };
}

export async function updateAppSettings(
  partial: Partial<Omit<AppSettings, 'id' | 'updatedAt'>>
): Promise<AppSettings> {
  const data = await ensureLoaded();
  const now = new Date().toISOString();
  data.appSettings = {
    ...data.appSettings,
    displayName: partial.displayName ?? data.appSettings.displayName,
    notifyPriceAlerts: partial.notifyPriceAlerts ?? data.appSettings.notifyPriceAlerts,
    notifyBudgetAlerts: partial.notifyBudgetAlerts ?? data.appSettings.notifyBudgetAlerts,
    updatedAt: now,
  };
  await persist();
  return { ...data.appSettings };
}

export async function getReceiptsInDateRange(startDate: string, endDate: string): Promise<Receipt[]> {
  return getReceipts({ startDate, endDate });
}

export type ReceiptItemWithStore = ReceiptItem & {
  storeName: string;
  receiptDate: string;
};

export async function getReceiptItemsWithStore(): Promise<ReceiptItemWithStore[]> {
  const data = await ensureLoaded();
  const receiptById = new Map(data.receipts.map((receipt) => [receipt.id, receipt]));
  return data.receiptItems
    .map((item) => {
      const receipt = receiptById.get(item.receiptId);
      if (!receipt) return null;
      return {
        ...item,
        storeName: receipt.storeName,
        receiptDate: receipt.date,
      };
    })
    .filter((item): item is ReceiptItemWithStore => item !== null)
    .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
}

export async function getDistinctStores(): Promise<string[]> {
  const data = await ensureLoaded();
  return [...new Set(data.receipts.map((receipt) => receipt.storeName))].sort();
}

export async function getCustomStores(): Promise<StoreDefinition[]> {
  const data = await ensureLoaded();
  return [...(data.customStores ?? [])].sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCustomStore(store: StoreDefinition): Promise<void> {
  const data = await ensureLoaded();
  if (!data.customStores) data.customStores = [];
  const exists = data.customStores.some(
    (entry) => entry.name.trim().toLowerCase() === store.name.trim().toLowerCase()
  );
  if (!exists) {
    data.customStores.push(store);
    await persist();
  }
}
