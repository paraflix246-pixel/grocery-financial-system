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
  PantryItem,
  PantryItemSource,
  PriceAlertRule,
  Receipt,
  ReceiptFilters,
  ReceiptItem,
  StorePreference,
} from '@/src/models/types';
import { generateId } from '@/src/utils/id';
import { defaultCategoryLimits } from '@/src/utils/budgetDefaults';
import {
  isDuplicateReceiptTotal,
  normalizeStoreForDuplicate,
} from '@/src/utils/duplicateReceipt';
import {
  applyReceiptTotals,
  normalizeReceiptTotalsForSave,
} from '@/src/utils/receiptTotals';
import { DEFAULT_NOTIFICATION_PREFS } from '@/src/services/notificationPreferenceLogic';
import { DEFAULT_LIVE_PRICE_ESTIMATES_ENABLED } from '@/src/services/livePriceEstimatesPreferenceLogic';
import { inferPantryCategory } from '@/src/utils/pantryCategory';
import { inferDefaultShelfLifeDays } from '@/src/utils/pantryStatus';
import { migrateLegacyListNames } from '@/src/utils/shoppingListCreate';
import {
  getPersonalReceiptOwnerId,
  readLegacyReceiptOwnerId,
  writeLegacyReceiptOwnerId,
} from '@/src/services/personalReceiptScope';
import {
  filterPersonalReceipts,
  resolveLegacyReceiptClaim,
} from '@/src/services/personalReceiptScopeLogic';

const DEFAULT_STORAGE_KEY = '@grocery_financial_async_data_v1';

let storageKey = DEFAULT_STORAGE_KEY;

function normalizeAsyncNotificationPrefs(
  partial?: Partial<AppSettings> | null
): typeof DEFAULT_NOTIFICATION_PREFS {
  return {
    pushNotificationsEnabled:
      partial?.pushNotificationsEnabled ?? DEFAULT_NOTIFICATION_PREFS.pushNotificationsEnabled,
    notifyPriceAlerts: partial?.notifyPriceAlerts ?? DEFAULT_NOTIFICATION_PREFS.notifyPriceAlerts,
    notifyPriceChangeAlerts:
      partial?.notifyPriceChangeAlerts ?? DEFAULT_NOTIFICATION_PREFS.notifyPriceChangeAlerts,
    notifySaleAlerts: partial?.notifySaleAlerts ?? DEFAULT_NOTIFICATION_PREFS.notifySaleAlerts,
    notifyCheaperStoreAlerts:
      partial?.notifyCheaperStoreAlerts ?? DEFAULT_NOTIFICATION_PREFS.notifyCheaperStoreAlerts,
    notifyBudgetAlerts: partial?.notifyBudgetAlerts ?? DEFAULT_NOTIFICATION_PREFS.notifyBudgetAlerts,
    notifyWeeklySummaryAlerts:
      partial?.notifyWeeklySummaryAlerts ?? DEFAULT_NOTIFICATION_PREFS.notifyWeeklySummaryAlerts,
    notifyFamilyListAlerts:
      partial?.notifyFamilyListAlerts ?? DEFAULT_NOTIFICATION_PREFS.notifyFamilyListAlerts,
    notifyPantryLowAlerts:
      partial?.notifyPantryLowAlerts ?? DEFAULT_NOTIFICATION_PREFS.notifyPantryLowAlerts,
    notifyHouseholdReceiptAlerts:
      partial?.notifyHouseholdReceiptAlerts ?? DEFAULT_NOTIFICATION_PREFS.notifyHouseholdReceiptAlerts,
  };
}

export function configureAsyncStorageKey(key: string): void {
  storageKey = key;
  store = null;
  loadPromise = null;
}

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
  storePreferences: StorePreference[];
  priceAlertRules: PriceAlertRule[];
  pantryItems: PantryItem[];
};

let store: WebStore | null = null;
let loadPromise: Promise<void> | null = null;

async function persist(): Promise<void> {
  if (!store) return;
  await AsyncStorage.setItem(storageKey, JSON.stringify(store));
}

async function loadStore(): Promise<void> {
  const raw = await AsyncStorage.getItem(storageKey);
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
      appSettings: {
        ...(parsed.appSettings ?? {
          id: generateId(),
          displayName: '',
          ...DEFAULT_NOTIFICATION_PREFS,
          enhancedCloudOcr: false,
          aiReceiptCleanup: true,
          communityPriceSharing: false,
          receiptImageStorage: 'ask_each_time',
          rememberReceiptImageChoice: false,
          showLivePriceEstimates: DEFAULT_LIVE_PRICE_ESTIMATES_ENABLED,
          updatedAt: new Date().toISOString(),
        }),
        enhancedCloudOcr: parsed.appSettings?.enhancedCloudOcr ?? false,
        aiReceiptCleanup: parsed.appSettings?.aiReceiptCleanup ?? true,
        ...normalizeAsyncNotificationPrefs(parsed.appSettings),
        communityPriceSharing: parsed.appSettings?.communityPriceSharing ?? false,
        receiptImageStorage: parsed.appSettings?.receiptImageStorage ?? 'ask_each_time',
        rememberReceiptImageChoice: parsed.appSettings?.rememberReceiptImageChoice ?? false,
        showLivePriceEstimates:
          parsed.appSettings?.showLivePriceEstimates ?? DEFAULT_LIVE_PRICE_ESTIMATES_ENABLED,
      },
      customStores: parsed.customStores ?? [],
      storePreferences: parsed.storePreferences ?? [],
      priceAlertRules: parsed.priceAlertRules ?? [],
      pantryItems: (parsed.pantryItems ?? []).map((item) => {
        const category = item.category ?? inferPantryCategory(item.name, item.canonicalName);
        return {
          ...item,
          category,
          lowStockThreshold: item.lowStockThreshold ?? 3,
          shelfLifeDays:
            item.shelfLifeDays ??
            inferDefaultShelfLifeDays({ name: item.name, category }) ??
            undefined,
        };
      }),
    };
    if (migrateReceiptTotalsWeb(store)) {
      await persist();
    }
    const needsCategoryPersist = (parsed.pantryItems ?? []).some((item) => !item.category);
    const needsShelfLifePersist = (parsed.pantryItems ?? []).some((item) => {
      const category = item.category ?? inferPantryCategory(item.name, item.canonicalName);
      return item.shelfLifeDays == null && inferDefaultShelfLifeDays({ name: item.name, category }) != null;
    });
    if (needsCategoryPersist || needsShelfLifePersist) {
      await persist();
    }
    if (store.pantryItems.length === 0 && store.receiptItems.length > 0) {
      const { backfillPantryFromReceipts } = await import('@/src/services/pantryService');
      await backfillPantryFromReceipts();
    }
    const fromVersion = parsed.schemaVersion ?? 0;
    if (fromVersion < SCHEMA_VERSION) {
      const { lists: migratedLists, changed } = migrateLegacyListNames(store.lists);
      if (changed) {
        store.lists = migratedLists;
        store.schemaVersion = SCHEMA_VERSION;
        await persist();
      } else if (fromVersion < SCHEMA_VERSION) {
        store.schemaVersion = SCHEMA_VERSION;
        await persist();
      }
    }
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
      ...DEFAULT_NOTIFICATION_PREFS,
      enhancedCloudOcr: false,
      aiReceiptCleanup: true,
      communityPriceSharing: false,
      receiptImageStorage: 'ask_each_time',
      rememberReceiptImageChoice: false,
      updatedAt: now,
    },
    customStores: [],
    storePreferences: [],
    priceAlertRules: [],
    pantryItems: [],
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

export async function initAsyncStorage(): Promise<void> {
  await ensureLoaded();
}

// --- Grocery Lists ---

export async function getAllLists(): Promise<GroceryList[]> {
  const data = await ensureLoaded();
  const { lists: migrated, changed } = migrateLegacyListNames(data.lists);
  if (changed) {
    data.lists = migrated;
    await persist();
  }
  return [...migrated].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getListById(id: string): Promise<GroceryList | null> {
  const lists = await getAllLists();
  return lists.find((list) => list.id === id) ?? null;
}

export async function getActiveList(): Promise<GroceryList | null> {
  const lists = await getAllLists();
  return lists.find((list) => list.isActive) ?? null;
}

export type CreateListOptions = {
  storeId?: string;
  storeName?: string;
  recurrence?: GroceryList['recurrence'];
  layoutMode?: GroceryList['layoutMode'];
  setActive?: boolean;
};

export async function createList(name: string, options: CreateListOptions = {}): Promise<GroceryList> {
  const data = await ensureLoaded();
  const now = new Date().toISOString();
  const id = generateId();
  const isFirst = data.lists.length === 0;
  const isActive = options.setActive ?? isFirst;
  const list: GroceryList = {
    id,
    name,
    isActive,
    storeId: options.storeId,
    storeName: options.storeName,
    recurrence: options.recurrence,
    layoutMode: options.layoutMode ?? 'category',
    completedAt: undefined,
    createdAt: now,
    updatedAt: now,
  };
  if (isActive) {
    for (const entry of data.lists) entry.isActive = false;
  }
  data.lists.push(list);
  await persist();
  return list;
}

export type UpdateListPatch = {
  name?: string;
  storeId?: string | null;
  storeName?: string | null;
  recurrence?: GroceryList['recurrence'] | null;
  layoutMode?: GroceryList['layoutMode'];
};

export async function updateList(id: string, name: string): Promise<void> {
  await patchList(id, { name });
}

export async function patchList(id: string, patch: UpdateListPatch): Promise<void> {
  const data = await ensureLoaded();
  const list = data.lists.find((entry) => entry.id === id);
  if (!list) return;
  if (patch.name !== undefined) list.name = patch.name;
  if (patch.storeId !== undefined) list.storeId = patch.storeId ?? undefined;
  if (patch.storeName !== undefined) list.storeName = patch.storeName ?? undefined;
  if (patch.recurrence !== undefined) list.recurrence = patch.recurrence ?? undefined;
  if (patch.layoutMode !== undefined) list.layoutMode = patch.layoutMode;
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
    if (list.id === id) {
      list.completedAt = undefined;
      list.updatedAt = now;
    }
  }
  await persist();
}

export async function markListCompleted(id: string): Promise<void> {
  const data = await ensureLoaded();
  const now = new Date().toISOString();
  for (const list of data.lists) {
    if (list.id === id) {
      list.isActive = false;
      list.completedAt = now;
      list.updatedAt = now;
    }
  }
  await persist();
}

export async function deactivateList(id: string): Promise<void> {
  const data = await ensureLoaded();
  const list = data.lists.find((entry) => entry.id === id && entry.isActive);
  if (!list) return;
  list.isActive = false;
  list.updatedAt = new Date().toISOString();
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
    imageUrl: itemData.imageUrl,
    sortOrder,
  };
  data.listItems.push(item);
  const list = data.lists.find((entry) => entry.id === listId);
  if (list) list.updatedAt = new Date().toISOString();
  const active = await getActiveList();
  if (!active) {
    await setActiveList(listId);
  } else if (active.id !== listId && existing.length === 0) {
    const activeItems = await getListItems(active.id);
    if (activeItems.length === 0) {
      await setActiveList(listId);
    }
  }
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

export async function deleteListItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const data = await ensureLoaded();
  const idSet = new Set(ids);
  const affectedListIds = new Set(
    data.listItems.filter((item) => idSet.has(item.id)).map((item) => item.listId)
  );
  data.listItems = data.listItems.filter((item) => !idSet.has(item.id));
  const now = new Date().toISOString();
  for (const listId of affectedListIds) {
    const list = data.lists.find((entry) => entry.id === listId);
    if (list) list.updatedAt = now;
  }
  await persist();
}

// --- Receipts ---

async function ensurePersonalReceiptOwnership(data: WebStore): Promise<string | null> {
  const ownerId = await getPersonalReceiptOwnerId();
  if (!ownerId) return null;

  const unownedCount = data.receipts.filter((receipt) => !receipt.ownerUserId).length;
  if (unownedCount <= 0) return ownerId;

  const legacyOwnerId = await readLegacyReceiptOwnerId();
  const claim = resolveLegacyReceiptClaim(ownerId, legacyOwnerId, unownedCount);
  if (claim.action === 'assign') {
    if (!legacyOwnerId) {
      await writeLegacyReceiptOwnerId(claim.ownerId);
    }
    for (const receipt of data.receipts) {
      if (!receipt.ownerUserId) {
        receipt.ownerUserId = claim.ownerId;
      }
    }
    await persist();
  }

  return ownerId;
}

async function getScopedPersonalReceipts(data: WebStore): Promise<{
  ownerId: string;
  receipts: Receipt[];
} | null> {
  const ownerId = await ensurePersonalReceiptOwnership(data);
  if (!ownerId) return null;
  return {
    ownerId,
    receipts: filterPersonalReceipts(data.receipts, ownerId),
  };
}

export async function transferPersonalReceiptsOnSignIn(
  fromOwnerId: string,
  toOwnerId: string
): Promise<void> {
  if (!fromOwnerId || !toOwnerId || fromOwnerId === toOwnerId) return;
  const data = await ensureLoaded();
  let changed = false;
  for (const receipt of data.receipts) {
    if (receipt.ownerUserId === fromOwnerId) {
      receipt.ownerUserId = toOwnerId;
      changed = true;
    }
  }
  if (changed) {
    await persist();
  }
}

function migrateReceiptTotalsWeb(data: WebStore): boolean {
  let changed = false;
  const now = new Date().toISOString();
  for (const receipt of data.receipts) {
    if ((receipt.total ?? 0) > 0) continue;
    const items = data.receiptItems.filter((item) => item.receiptId === receipt.id);
    if (items.length === 0) continue;
    const totals = normalizeReceiptTotalsForSave(items, receipt.tax);
    receipt.subtotal = totals.subtotal;
    receipt.tax = totals.tax;
    receipt.total = totals.total;
    receipt.updatedAt = now;
    changed = true;
  }
  return changed;
}

export async function getReceipts(filters?: ReceiptFilters): Promise<Receipt[]> {
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return [];

  let receipts = [...scoped.receipts];
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
  if (filters?.storeRegion) {
    const region = filters.storeRegion.trim().toUpperCase();
    receipts = receipts.filter(
      (receipt) => (receipt.storeRegion ?? '').toUpperCase() === region
    );
  }
  return receipts
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
    })
    .map((receipt) => {
      const items = data.receiptItems.filter((item) => item.receiptId === receipt.id);
      return applyReceiptTotals(receipt, items);
    });
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return null;

  const receipt = scoped.receipts.find((entry) => entry.id === id);
  if (!receipt) return null;
  const items = await getReceiptItems(id);
  return applyReceiptTotals({ ...receipt, items }, items);
}

export async function getReceiptItems(receiptId: string): Promise<ReceiptItem[]> {
  const data = await ensureLoaded();
  return data.receiptItems.filter((item) => item.receiptId === receiptId);
}

export async function findDuplicateReceipt(
  storeName: string,
  date: string,
  total: number,
  excludeId?: string,
  storeRegion?: string | null
): Promise<Receipt | null> {
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return null;

  const normalizedStore = normalizeStoreForDuplicate(storeName);
  const normalizedRegion = storeRegion?.trim().toUpperCase();
  for (const receipt of scoped.receipts) {
    if (excludeId && receipt.id === excludeId) continue;
    if (receipt.date !== date) continue;
    if (normalizeStoreForDuplicate(receipt.storeName) !== normalizedStore) continue;
    if (normalizedRegion && receipt.storeRegion?.trim()) {
      if (receipt.storeRegion.trim().toUpperCase() !== normalizedRegion) continue;
    }
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
  const ownerId = await ensurePersonalReceiptOwnership(data);
  if (!ownerId) throw new Error('Sign in to save personal receipts.');

  const { assertCanSaveNewReceipt } = await import('@/src/services/scanLimitService');
  const { assertCanTrackStore } = await import('@/src/services/tierLimits');
  await assertCanSaveNewReceipt();
  await assertCanTrackStore(receipt.storeName);

  const now = new Date().toISOString();
  const id = receipt.id || generateId();
  const { items, ...receiptFields } = receipt;
  const saved: Receipt = {
    ...receiptFields,
    id,
    ownerUserId: ownerId,
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
  const result = { ...saved, items: savedItems };
  const { contributeFromReceipt } = await import('@/src/services/crowdsourcedPricingService');
  await contributeFromReceipt(result);
  const { syncPantryFromReceipt } = await import('@/src/services/pantryService');
  await syncPantryFromReceipt(result, { quantityMode: 'increment' });
  const { invalidateScopedReceiptsCache } = await import('@/src/services/scopedReceiptService');
  invalidateScopedReceiptsCache('personal');
  return result;
}

export async function updateReceipt(
  id: string,
  receipt: Partial<Omit<Receipt, 'items'>> & { items?: Array<Omit<ReceiptItem, 'receiptId'>> }
): Promise<void> {
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return;

  const existing = await getReceiptById(id);
  if (!existing) return;

  const nextStoreName = receipt.storeName ?? existing.storeName;
  if (nextStoreName.trim() && nextStoreName !== existing.storeName) {
    const { assertCanTrackStore } = await import('@/src/services/tierLimits');
    await assertCanTrackStore(nextStoreName);
  }

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
    storeAddress: receipt.storeAddress !== undefined ? receipt.storeAddress : existing.storeAddress,
    storeCity: receipt.storeCity !== undefined ? receipt.storeCity : existing.storeCity,
    storeRegion: receipt.storeRegion !== undefined ? receipt.storeRegion : existing.storeRegion,
    storePostalCode:
      receipt.storePostalCode !== undefined ? receipt.storePostalCode : existing.storePostalCode,
    storeCountry: receipt.storeCountry !== undefined ? receipt.storeCountry : existing.storeCountry,
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
  const updated = await getReceiptById(id);
  if (updated?.items) {
    const { syncPantryFromReceipt } = await import('@/src/services/pantryService');
    await syncPantryFromReceipt(updated, { quantityMode: 'set' });
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  await deleteReceipts([id]);
}

export async function deleteReceipts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return;

  const idSet = new Set(ids);
  const ownedIds = new Set(scoped.receipts.filter((receipt) => idSet.has(receipt.id)).map((r) => r.id));
  if (ownedIds.size === 0) return;

  const comparisonIds = data.comparisons
    .filter((comparison) => ownedIds.has(comparison.receiptId))
    .map((comparison) => comparison.id);
  const comparisonIdSet = new Set(comparisonIds);
  data.comparisonItems = data.comparisonItems.filter(
    (item) => !comparisonIdSet.has(item.comparisonId)
  );
  data.comparisons = data.comparisons.filter((comparison) => !ownedIds.has(comparison.receiptId));
  data.receiptItems = data.receiptItems.filter((item) => !ownedIds.has(item.receiptId));
  data.receipts = data.receipts.filter((receipt) => !ownedIds.has(receipt.id));
  await persist();
}

export async function deleteAllReceipts(): Promise<number> {
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return 0;

  const count = scoped.receipts.length;
  if (count === 0) return 0;

  const ownedIds = new Set(scoped.receipts.map((receipt) => receipt.id));
  const comparisonIds = data.comparisons
    .filter((comparison) => ownedIds.has(comparison.receiptId))
    .map((comparison) => comparison.id);
  const comparisonIdSet = new Set(comparisonIds);
  data.comparisonItems = data.comparisonItems.filter(
    (item) => !comparisonIdSet.has(item.comparisonId)
  );
  data.comparisons = data.comparisons.filter((comparison) => !ownedIds.has(comparison.receiptId));
  data.receiptItems = data.receiptItems.filter((item) => !ownedIds.has(item.receiptId));
  data.receipts = data.receipts.filter((receipt) => !ownedIds.has(receipt.id));
  await persist();
  return count;
}

export async function linkReceiptToList(receiptId: string, listId: string): Promise<void> {
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return;

  const receipt = scoped.receipts.find((entry) => entry.id === receiptId);
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

export async function getAllComparisons(): Promise<Comparison[]> {
  const data = await ensureLoaded();
  return [...data.comparisons].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
    pushNotificationsEnabled:
      partial.pushNotificationsEnabled ?? data.appSettings.pushNotificationsEnabled,
    notifyPriceAlerts: partial.notifyPriceAlerts ?? data.appSettings.notifyPriceAlerts,
    notifyPriceChangeAlerts:
      partial.notifyPriceChangeAlerts ?? data.appSettings.notifyPriceChangeAlerts,
    notifySaleAlerts: partial.notifySaleAlerts ?? data.appSettings.notifySaleAlerts,
    notifyCheaperStoreAlerts:
      partial.notifyCheaperStoreAlerts ?? data.appSettings.notifyCheaperStoreAlerts,
    notifyBudgetAlerts: partial.notifyBudgetAlerts ?? data.appSettings.notifyBudgetAlerts,
    notifyWeeklySummaryAlerts:
      partial.notifyWeeklySummaryAlerts ?? data.appSettings.notifyWeeklySummaryAlerts,
    notifyFamilyListAlerts:
      partial.notifyFamilyListAlerts ?? data.appSettings.notifyFamilyListAlerts,
    notifyPantryLowAlerts: partial.notifyPantryLowAlerts ?? data.appSettings.notifyPantryLowAlerts,
    notifyHouseholdReceiptAlerts:
      partial.notifyHouseholdReceiptAlerts ?? data.appSettings.notifyHouseholdReceiptAlerts,
    enhancedCloudOcr: partial.enhancedCloudOcr ?? data.appSettings.enhancedCloudOcr,
    aiReceiptCleanup: partial.aiReceiptCleanup ?? data.appSettings.aiReceiptCleanup,
    communityPriceSharing: partial.communityPriceSharing ?? data.appSettings.communityPriceSharing,
    receiptImageStorage: partial.receiptImageStorage ?? data.appSettings.receiptImageStorage,
    rememberReceiptImageChoice:
      partial.rememberReceiptImageChoice ?? data.appSettings.rememberReceiptImageChoice,
    showLivePriceEstimates:
      partial.showLivePriceEstimates ?? data.appSettings.showLivePriceEstimates,
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
  storeRegion?: string;
  storePostalCode?: string;
  storeCountry?: string;
};

export async function getReceiptItemsWithStore(): Promise<ReceiptItemWithStore[]> {
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return [];

  const receiptById = new Map(scoped.receipts.map((receipt) => [receipt.id, receipt]));
  const items: ReceiptItemWithStore[] = [];
  for (const item of data.receiptItems) {
    const receipt = receiptById.get(item.receiptId);
    if (!receipt) continue;
    items.push({
      ...item,
      storeName: receipt.storeName,
      receiptDate: receipt.date,
      storeRegion: receipt.storeRegion,
      storePostalCode: receipt.storePostalCode,
      storeCountry: receipt.storeCountry,
    });
  }
  return items.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
}

export async function getDistinctStores(): Promise<string[]> {
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return [];
  return [...new Set(scoped.receipts.map((receipt) => receipt.storeName))].sort();
}

export async function getDistinctRegions(): Promise<string[]> {
  const data = await ensureLoaded();
  const scoped = await getScopedPersonalReceipts(data);
  if (!scoped) return [];
  return [
    ...new Set(
      scoped.receipts
        .map((receipt) => receipt.storeRegion?.trim())
        .filter((region): region is string => Boolean(region))
    ),
  ].sort();
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

export async function getStorePreferences(): Promise<StorePreference[]> {
  const data = await ensureLoaded();
  return [...(data.storePreferences ?? [])];
}

export async function upsertStorePreference(input: {
  storeId: string;
  isFavorite?: boolean;
  isHidden?: boolean;
  region?: string | null;
}): Promise<StorePreference> {
  const data = await ensureLoaded();
  if (!data.storePreferences) data.storePreferences = [];
  const now = new Date().toISOString();
  const index = data.storePreferences.findIndex((entry) => entry.storeId === input.storeId);
  const current =
    index >= 0
      ? data.storePreferences[index]
      : {
          storeId: input.storeId,
          isFavorite: false,
          isHidden: false,
          region: undefined,
          updatedAt: now,
        };
  const saved: StorePreference = {
    storeId: input.storeId,
    isFavorite: input.isFavorite ?? current.isFavorite,
    isHidden: input.isHidden ?? current.isHidden,
    region:
      input.region !== undefined
        ? input.region?.trim().toUpperCase() || undefined
        : current.region,
    updatedAt: now,
  };
  if (index >= 0) {
    data.storePreferences[index] = saved;
  } else {
    data.storePreferences.push(saved);
  }
  await persist();
  return saved;
}

export async function deleteCustomStore(storeId: string): Promise<void> {
  const data = await ensureLoaded();
  data.customStores = (data.customStores ?? []).filter((store) => store.id !== storeId);
  data.storePreferences = (data.storePreferences ?? []).filter((pref) => pref.storeId !== storeId);
  await persist();
}

export async function getPriceAlertRules(): Promise<PriceAlertRule[]> {
  const data = await ensureLoaded();
  return [...(data.priceAlertRules ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function savePriceAlertRule(
  rule: Omit<PriceAlertRule, 'createdAt'> & { createdAt?: string }
): Promise<PriceAlertRule> {
  const data = await ensureLoaded();
  if (!data.priceAlertRules) data.priceAlertRules = [];
  const createdAt = rule.createdAt ?? new Date().toISOString();
  const saved: PriceAlertRule = {
    id: rule.id || generateId(),
    itemName: rule.itemName,
    canonicalName: rule.canonicalName,
    emoji: rule.emoji,
    targetPrice: rule.targetPrice,
    enabled: rule.enabled,
    createdAt,
  };
  const index = data.priceAlertRules.findIndex((entry) => entry.id === saved.id);
  if (index >= 0) {
    data.priceAlertRules[index] = saved;
  } else {
    data.priceAlertRules.push(saved);
  }
  await persist();
  return saved;
}

export async function deletePriceAlertRule(id: string): Promise<void> {
  const data = await ensureLoaded();
  data.priceAlertRules = (data.priceAlertRules ?? []).filter((entry) => entry.id !== id);
  await persist();
}

export async function getDistinctItemNames(): Promise<string[]> {
  const data = await ensureLoaded();
  const seen = new Map<string, string>();
  for (const item of data.receiptItems) {
    const trimmed = item.name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

function findPantryItemByCanonical(data: WebStore, canonicalKey: string): PantryItem | undefined {
  return data.pantryItems.find(
    (item) => (item.canonicalName ?? item.name).trim().toLowerCase() === canonicalKey
  );
}

export async function getPantryItems(): Promise<PantryItem[]> {
  const data = await ensureLoaded();
  return [...data.pantryItems].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createPantryItem(
  itemData: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt' | 'source'> & { source?: PantryItemSource }
): Promise<PantryItem> {
  const data = await ensureLoaded();
  const canonicalKey = (itemData.canonicalName ?? itemData.name).trim().toLowerCase();
  const existing = findPantryItemByCanonical(data, canonicalKey);
  if (existing) {
    return updatePantryItem(existing.id, {
      name: itemData.name,
      canonicalName: itemData.canonicalName,
      emoji: itemData.emoji,
      quantity: itemData.quantity,
      unit: itemData.unit,
      category: itemData.category,
      categoryUserSet: itemData.categoryUserSet ?? existing.categoryUserSet,
      lowStockThreshold: itemData.lowStockThreshold,
      shelfLifeDays: itemData.shelfLifeDays,
      addedDate: itemData.addedDate,
      source: itemData.source ?? 'manual',
    });
  }

  const { assertCanAddPantryItem } = await import('@/src/services/tierLimits');
  await assertCanAddPantryItem(canonicalKey);

  const now = new Date().toISOString();
  const item: PantryItem = {
    id: generateId(),
    name: itemData.name,
    canonicalName: itemData.canonicalName,
    emoji: itemData.emoji,
    quantity: itemData.quantity,
    unit: itemData.unit,
    category: itemData.category,
    categoryUserSet: itemData.categoryUserSet ?? false,
    lowStockThreshold: itemData.lowStockThreshold ?? 3,
    shelfLifeDays: itemData.shelfLifeDays,
    addedDate: itemData.addedDate,
    source: itemData.source ?? 'manual',
    createdAt: now,
    updatedAt: now,
  };
  data.pantryItems.push(item);
  await persist();
  return item;
}

export async function updatePantryItem(
  id: string,
  itemData: Partial<Omit<PantryItem, 'id' | 'createdAt'>>
): Promise<PantryItem> {
  const data = await ensureLoaded();
  const index = data.pantryItems.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new Error(`Pantry item not found: ${id}`);
  }
  const before = data.pantryItems[index];
  const now = new Date().toISOString();
  const next = {
    ...before,
    ...itemData,
    updatedAt: now,
  };
  data.pantryItems[index] = next;
  await persist();
  void import('@/src/services/notificationService').then(({ maybeNotifyPantryLowStock }) =>
    maybeNotifyPantryLowStock(before, next)
  );
  return next;
}

export async function deletePantryItem(id: string): Promise<void> {
  const data = await ensureLoaded();
  data.pantryItems = data.pantryItems.filter((entry) => entry.id !== id);
  await persist();
}

export async function deletePantryItems(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const data = await ensureLoaded();
  const idSet = new Set(ids);
  data.pantryItems = data.pantryItems.filter((entry) => !idSet.has(entry.id));
  await persist();
}

export async function upsertPantryItemFromReceipt(
  input: {
    name: string;
    canonicalName?: string;
    emoji?: string;
    quantity: number;
    unit?: string;
    category?: string;
    shelfLifeDays?: number;
    addedDate: string;
  },
  quantityMode: 'increment' | 'set' = 'set'
): Promise<PantryItem> {
  const data = await ensureLoaded();
  const canonicalKey = (input.canonicalName ?? input.name).trim().toLowerCase();
  const existing = findPantryItemByCanonical(data, canonicalKey);
  if (existing?.source === 'manual') {
    return existing;
  }
  const nextQuantity =
    existing && quantityMode === 'increment'
      ? existing.quantity + input.quantity
      : input.quantity;
  if (existing) {
    const category = existing.categoryUserSet
      ? existing.category
      : input.category ?? existing.category;
    return updatePantryItem(existing.id, {
      name: input.name,
      canonicalName: input.canonicalName,
      emoji: input.emoji ?? existing.emoji,
      quantity: nextQuantity,
      unit: input.unit ?? existing.unit,
      category,
      categoryUserSet: existing.categoryUserSet,
      shelfLifeDays: input.shelfLifeDays ?? existing.shelfLifeDays,
      addedDate: input.addedDate,
      source: 'receipt',
    });
  }
  return createPantryItem({
    name: input.name,
    canonicalName: input.canonicalName,
    emoji: input.emoji,
    quantity: input.quantity,
    unit: input.unit,
    category: input.category ?? inferPantryCategory(input.name, input.canonicalName),
    shelfLifeDays: input.shelfLifeDays,
    addedDate: input.addedDate,
    source: 'receipt',
  });
}
