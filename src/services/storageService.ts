import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { DB_NAME, MIGRATIONS, SCHEMA_VERSION } from '@/src/models/schema';
import * as asyncBackend from '@/src/services/storageService.asyncBackend';
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
import type { StoreDefinition } from '@/src/data/stores';
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
import { inferPantryCategory, normalizePantryCategory } from '@/src/utils/pantryCategory';
import { migrateLegacyListNames } from '@/src/utils/shoppingListCreate';

const NATIVE_ASYNC_STORAGE_KEY = '@grocery_financial_native_fallback_v1';
const WEB_ASYNC_STORAGE_KEY = '@grocery_financial_web_v1';
const SQLITE_OPEN_TIMEOUT_MS = 5_000;

export type StorageMode = 'sqlite' | 'async' | 'pending';
export let storageMode: StorageMode = 'pending';

let initPromise: Promise<void> | null = null;

async function routeToAsync(
  method: keyof typeof asyncBackend,
  ...args: unknown[]
): Promise<unknown | undefined> {
  await ensureStorageReady();
  if (storageMode !== 'async') return undefined;
  const fn = asyncBackend[method];
  if (typeof fn !== 'function') return undefined;
  return (fn as (...a: unknown[]) => unknown)(...args);
}

async function ensureStorageReady(): Promise<void> {
  if (!initPromise) {
    initPromise = initStorageInternal().catch((error) => {
      initPromise = null;
      throw error;
    });
  }
  await initPromise;
}

async function tryOpenWithTimeout(state: DbInitState): Promise<void> {
  await Promise.race([
    openDatabaseOnce(state),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`SQLite open timed out after ${SQLITE_OPEN_TIMEOUT_MS}ms`)),
        SQLITE_OPEN_TIMEOUT_MS
      );
    }),
  ]);
}

async function useAsyncStorageBackend(key: string): Promise<void> {
  asyncBackend.configureAsyncStorageKey(key);
  await asyncBackend.initAsyncStorage();
  storageMode = 'async';
}

async function initStorageInternal(): Promise<void> {
  storageMode = 'pending';

  // Web SQLite (IndexedDB) can hang or stall hydration; prefer AsyncStorage immediately.
  if (Platform.OS === 'web') {
    await useAsyncStorageBackend(WEB_ASYNC_STORAGE_KEY);
    return;
  }

  const state = getDbInitState();

  try {
    await tryOpenWithTimeout(state);
    storageMode = 'sqlite';
    return;
  } catch (firstError) {
    console.warn('[storage] SQLite init failed on first attempt, resetting DB and retrying:', firstError);
    state.instance = null;
    state.promise = null;
    state.initialized = false;
    state.generation += 1; // invalidate any still-running openDatabaseOnce call
    try {
      await SQLite.deleteDatabaseAsync(DB_NAME);
      console.log('[storage] Deleted stale DB file, retrying open...');
    } catch (deleteError) {
      console.warn('[storage] Could not delete DB file:', deleteError);
    }
  }

  try {
    await tryOpenWithTimeout(state);
    storageMode = 'sqlite';
    return;
  } catch (error) {
    console.warn('[storage] SQLite unavailable after retry, using AsyncStorage fallback:', error);
    if (!state.instance) {
      state.promise = null;
    }
    await useAsyncStorageBackend(NATIVE_ASYNC_STORAGE_KEY);
  }
}

type DbInitState = {
  instance: SQLite.SQLiteDatabase | null;
  promise: Promise<SQLite.SQLiteDatabase> | null;
  initialized: boolean;
  /** Incremented every time state is reset so in-flight openDatabaseOnce calls can detect they are stale. */
  generation: number;
};

const DB_INIT_KEY = '__grocery_financial_db_init__';

function getDbInitState(): DbInitState {
  const globalState = globalThis as typeof globalThis & {
    [DB_INIT_KEY]?: DbInitState;
  };
  if (!globalState[DB_INIT_KEY]) {
    globalState[DB_INIT_KEY] = { instance: null, promise: null, initialized: false, generation: 0 };
  }
  return globalState[DB_INIT_KEY];
}

/** On web, wait until after first paint before touching IndexedDB-backed SQLite. */
function waitForWebFirstPaint(): Promise<void> {
  if (Platform.OS !== 'web' || typeof requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function openDatabaseOnce(state: DbInitState): Promise<SQLite.SQLiteDatabase> {
  if (state.instance) return state.instance;

  await waitForWebFirstPaint();

  if (state.instance) return state.instance;

  // Capture the current generation so we can detect if the state is reset
  // (e.g. by the timeout-retry logic in initStorageInternal) while this
  // async open is still in flight.
  const generation = state.generation;

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await runMigrations(db);
  await migrateReceiptTotals(db);

  // If the state was reset while we were opening, this DB handle is stale.
  // Close it to avoid "shared object already released" from callers who get
  // the new instance while this one lingers.
  if (state.generation !== generation) {
    try { await db.closeAsync(); } catch { /* best-effort */ }
    throw new Error('[storage] DB open superseded by a state reset — discarding stale handle');
  }

  state.instance = db;
  state.initialized = true;
  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  await ensureStorageReady();
  if (storageMode === 'async') {
    throw new Error('SQLite unavailable (degraded AsyncStorage mode)');
  }
  const state = getDbInitState();
  if (state.instance) return state.instance;
  if (state.promise) return state.promise;

  state.promise = openDatabaseOnce(state).catch((error) => {
    if (!state.instance) {
      state.promise = null;
    }
    throw error;
  });

  return state.promise;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  for (const sql of MIGRATIONS) {
    await db.execAsync(sql);
  }
  const row = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1'
  );
  if (!row) {
    await migrateSchema(db, 0);
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION]);
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO budget_settings (id, weekly_budget, alert_threshold, updated_at) VALUES (?, ?, ?, ?)',
      [generateId(), 150, 0.9, now]
    );
    await seedAppSettings(db);
    return;
  }

  if (row.version < SCHEMA_VERSION) {
    await migrateSchema(db, row.version);
    await db.runAsync('UPDATE schema_version SET version = ?', [SCHEMA_VERSION]);
  }
}

async function seedAppSettings(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync('SELECT id FROM app_settings LIMIT 1');
  if (existing) return;
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO app_settings (id, display_name, notify_price_alerts, notify_budget_alerts, updated_at) VALUES (?, ?, ?, ?, ?)',
    [generateId(), '', 1, 1, now]
  );
}

async function migrateSchema(db: SQLite.SQLiteDatabase, fromVersion: number): Promise<void> {
  if (fromVersion < 3) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(budget_settings)');
    const hasCategoryLimits = columns.some((column) => column.name === 'category_limits');
    if (!hasCategoryLimits) {
      await db.execAsync('ALTER TABLE budget_settings ADD COLUMN category_limits TEXT');
    }
    await seedAppSettings(db);
  }
  if (fromVersion < 4) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS price_alert_rules (
        id TEXT PRIMARY KEY NOT NULL,
        item_name TEXT NOT NULL,
        target_price REAL NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );`
    );
  }
  if (fromVersion < 5) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(price_alert_rules)');
    const hasCanonicalName = columns.some((column) => column.name === 'canonical_name');
    if (!hasCanonicalName) {
      await db.execAsync('ALTER TABLE price_alert_rules ADD COLUMN canonical_name TEXT');
    }
  }
  if (fromVersion < 6) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(price_alert_rules)');
    const hasEmoji = columns.some((column) => column.name === 'emoji');
    if (!hasEmoji) {
      await db.execAsync('ALTER TABLE price_alert_rules ADD COLUMN emoji TEXT');
    }
  }
  if (fromVersion < 7) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(app_settings)');
    const hasEnhancedCloudOcr = columns.some((column) => column.name === 'enhanced_cloud_ocr');
    if (!hasEnhancedCloudOcr) {
      await db.execAsync('ALTER TABLE app_settings ADD COLUMN enhanced_cloud_ocr INTEGER NOT NULL DEFAULT 0');
    }
  }
  if (fromVersion < 8) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(app_settings)');
    const hasAiReceiptCleanup = columns.some((column) => column.name === 'ai_receipt_cleanup');
    if (!hasAiReceiptCleanup) {
      await db.execAsync('ALTER TABLE app_settings ADD COLUMN ai_receipt_cleanup INTEGER NOT NULL DEFAULT 1');
    }
  }
  if (fromVersion < 9) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(receipts)');
    const addColumn = async (name: string, sql: string) => {
      if (!columns.some((column) => column.name === name)) {
        await db.execAsync(sql);
      }
    };
    await addColumn('store_address', 'ALTER TABLE receipts ADD COLUMN store_address TEXT');
    await addColumn('store_city', 'ALTER TABLE receipts ADD COLUMN store_city TEXT');
    await addColumn('store_region', 'ALTER TABLE receipts ADD COLUMN store_region TEXT');
    await addColumn('store_postal_code', 'ALTER TABLE receipts ADD COLUMN store_postal_code TEXT');
    await addColumn('store_country', 'ALTER TABLE receipts ADD COLUMN store_country TEXT');
  }
  if (fromVersion < 10) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(receipt_items)');
    const addColumn = async (name: string, sql: string) => {
      if (!columns.some((column) => column.name === name)) {
        await db.execAsync(sql);
      }
    };
    await addColumn('unit_price', 'ALTER TABLE receipt_items ADD COLUMN unit_price REAL');
    await addColumn('unit', 'ALTER TABLE receipt_items ADD COLUMN unit TEXT');
  }
  if (fromVersion < 11) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS pantry_items (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        canonical_name TEXT,
        emoji TEXT,
        quantity REAL NOT NULL DEFAULT 1,
        unit TEXT,
        added_date TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_pantry_items_canonical ON pantry_items(canonical_name);'
    );
    const { backfillPantryFromReceipts } = await import('@/src/services/pantryService');
    await backfillPantryFromReceipts();
  }
  if (fromVersion < 12) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS pantry_items (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        canonical_name TEXT,
        emoji TEXT,
        quantity REAL NOT NULL DEFAULT 1,
        unit TEXT,
        category TEXT,
        added_date TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`
    );
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(pantry_items)');
    if (!columns.some((column) => column.name === 'category')) {
      await db.execAsync('ALTER TABLE pantry_items ADD COLUMN category TEXT');
    }
    const { inferPantryCategory } = await import('@/src/utils/pantryCategory');
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      canonical_name: string | null;
      category: string | null;
    }>('SELECT id, name, canonical_name, category FROM pantry_items');
    for (const row of rows) {
      if (row.category) continue;
      const category = inferPantryCategory(row.name, row.canonical_name ?? undefined);
      await db.runAsync('UPDATE pantry_items SET category = ? WHERE id = ?', [category, row.id]);
    }
  }
  if (fromVersion < 13) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(pantry_items)');
    if (!columns.some((column) => column.name === 'low_stock_threshold')) {
      await db.execAsync('ALTER TABLE pantry_items ADD COLUMN low_stock_threshold REAL DEFAULT 3');
    }
    await db.runAsync('UPDATE pantry_items SET low_stock_threshold = 3 WHERE low_stock_threshold IS NULL');
  }
  if (fromVersion < 14) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(pantry_items)');
    if (!columns.some((column) => column.name === 'shelf_life_days')) {
      await db.execAsync('ALTER TABLE pantry_items ADD COLUMN shelf_life_days REAL');
    }
    const { inferDefaultShelfLifeDays } = await import('@/src/utils/pantryStatus');
    const { inferPantryCategory } = await import('@/src/utils/pantryCategory');
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      canonical_name: string | null;
      category: string | null;
      shelf_life_days: number | null;
    }>('SELECT id, name, canonical_name, category, shelf_life_days FROM pantry_items');
    for (const row of rows) {
      if (row.shelf_life_days != null) continue;
      const category = row.category ?? inferPantryCategory(row.name, row.canonical_name ?? undefined);
      const shelfLife = inferDefaultShelfLifeDays({ name: row.name, category });
      if (shelfLife != null) {
        await db.runAsync('UPDATE pantry_items SET shelf_life_days = ? WHERE id = ?', [shelfLife, row.id]);
      }
    }
  }
  if (fromVersion < 15) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS store_preferences (
        store_id TEXT PRIMARY KEY NOT NULL,
        is_favorite INTEGER NOT NULL DEFAULT 0,
        is_hidden INTEGER NOT NULL DEFAULT 0,
        region TEXT,
        updated_at TEXT NOT NULL
      );`
    );
  }

  if (fromVersion < 16) {
    const listColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(grocery_lists)');
    const itemColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(list_items)');
    const addListColumn = async (name: string, sql: string) => {
      if (!listColumns.some((column) => column.name === name)) {
        await db.execAsync(sql);
      }
    };
    const addItemColumn = async (name: string, sql: string) => {
      if (!itemColumns.some((column) => column.name === name)) {
        await db.execAsync(sql);
      }
    };
    await addListColumn('store_id', 'ALTER TABLE grocery_lists ADD COLUMN store_id TEXT');
    await addListColumn('store_name', 'ALTER TABLE grocery_lists ADD COLUMN store_name TEXT');
    await addListColumn('recurrence', 'ALTER TABLE grocery_lists ADD COLUMN recurrence TEXT');
    await addListColumn('layout_mode', "ALTER TABLE grocery_lists ADD COLUMN layout_mode TEXT DEFAULT 'category'");
    await addItemColumn('image_url', 'ALTER TABLE list_items ADD COLUMN image_url TEXT');
  }

  if (fromVersion < 17) {
    const pantryColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(pantry_items)');
    if (!pantryColumns.some((column) => column.name === 'category_user_set')) {
      await db.execAsync(
        'ALTER TABLE pantry_items ADD COLUMN category_user_set INTEGER NOT NULL DEFAULT 0'
      );
    }
    const { inferPantryCategory } = await import('@/src/utils/pantryCategory');
    const rows = await db.getAllAsync<{
      id: string;
      name: string;
      canonical_name: string | null;
      category: string | null;
      category_user_set: number | null;
    }>(
      'SELECT id, name, canonical_name, category, category_user_set FROM pantry_items'
    );
    for (const row of rows) {
      if (row.category_user_set) continue;
      const category = inferPantryCategory(row.name, row.canonical_name ?? undefined);
      if (category !== row.category) {
        await db.runAsync('UPDATE pantry_items SET category = ? WHERE id = ?', [category, row.id]);
      }
    }
  }

  if (fromVersion < 18) {
    const { migrateLegacyListNames } = await import('@/src/utils/shoppingListCreate');
    const rows = await db.getAllAsync<{ id: string; name: string; is_active: number; created_at: string; updated_at: string }>(
      'SELECT id, name, is_active, created_at, updated_at FROM grocery_lists'
    );
    const lists = rows.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    const { lists: migrated, changed } = migrateLegacyListNames(lists);
    if (changed) {
      for (const list of migrated) {
        await db.runAsync('UPDATE grocery_lists SET name = ? WHERE id = ?', [list.name, list.id]);
      }
    }
  }

  if (fromVersion < 19) {
    const listColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(grocery_lists)');
    const hasCompletedAt = listColumns.some((column) => column.name === 'completed_at');
    if (!hasCompletedAt) {
      await db.runAsync('ALTER TABLE grocery_lists ADD COLUMN completed_at TEXT');
    }
  }
}

function parseCategoryLimits(raw: unknown, weeklyBudget: number): CategoryLimits | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as CategoryLimits;
  } catch {
    return defaultCategoryLimits(weeklyBudget * 4);
  }
}

function mapList(row: Record<string, unknown>): GroceryList {
  return {
    id: row.id as string,
    name: row.name as string,
    isActive: Boolean(row.is_active),
    storeId: (row.store_id as string) || undefined,
    storeName: (row.store_name as string) || undefined,
    recurrence: (row.recurrence as GroceryList['recurrence']) || undefined,
    layoutMode: (row.layout_mode as GroceryList['layoutMode']) || undefined,
    completedAt: (row.completed_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapListItem(row: Record<string, unknown>): ListItem {
  return {
    id: row.id as string,
    listId: row.list_id as string,
    name: row.name as string,
    expectedPrice: row.expected_price as number,
    quantity: row.quantity as number,
    category: row.category as string,
    storePreference: (row.store_preference as string) || undefined,
    imageUrl: (row.image_url as string) || undefined,
    sortOrder: row.sort_order as number,
  };
}

function mapReceipt(row: Record<string, unknown>): Receipt {
  return {
    id: row.id as string,
    storeName: row.store_name as string,
    date: row.date as string,
    subtotal: row.subtotal != null ? (row.subtotal as number) : undefined,
    tax: row.tax != null ? (row.tax as number) : undefined,
    total: row.total as number,
    imageUri: row.image_uri as string,
    linkedListId: (row.linked_list_id as string) || undefined,
    userCorrected: Boolean(row.user_corrected),
    storeAddress: (row.store_address as string) || undefined,
    storeCity: (row.store_city as string) || undefined,
    storeRegion: (row.store_region as string) || undefined,
    storePostalCode: (row.store_postal_code as string) || undefined,
    storeCountry: (row.store_country as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapReceiptItem(row: Record<string, unknown>): ReceiptItem {
  return {
    id: row.id as string,
    receiptId: row.receipt_id as string,
    name: row.name as string,
    price: row.price as number,
    quantity: row.quantity as number,
    unitPrice: row.unit_price != null ? (row.unit_price as number) : undefined,
    unit: (row.unit as string) || undefined,
  };
}

function mapComparison(row: Record<string, unknown>): Comparison {
  return {
    id: row.id as string,
    receiptId: row.receipt_id as string,
    listId: row.list_id as string,
    plannedTotal: row.planned_total as number,
    actualTotal: row.actual_total as number,
    variance: row.variance as number,
    createdAt: row.created_at as string,
  };
}

function mapComparisonItem(row: Record<string, unknown>): ComparisonItem {
  return {
    id: row.id as string,
    comparisonId: row.comparison_id as string,
    listItemId: (row.list_item_id as string) || undefined,
    receiptItemId: (row.receipt_item_id as string) || undefined,
    matchType: row.match_type as ComparisonItem['matchType'],
    name: row.name as string,
    plannedPrice: row.planned_price != null ? (row.planned_price as number) : undefined,
    actualPrice: row.actual_price != null ? (row.actual_price as number) : undefined,
    variance: row.variance != null ? (row.variance as number) : undefined,
  };
}

// --- Grocery Lists ---

async function applyLegacyListNameMigration(lists: GroceryList[]): Promise<GroceryList[]> {
  const { lists: migrated, changed } = migrateLegacyListNames(lists);
  if (!changed) return lists;

  const db = await getDatabase();
  const now = new Date().toISOString();
  for (const list of migrated) {
    const original = lists.find((entry) => entry.id === list.id);
    if (original && original.name !== list.name) {
      await db.runAsync('UPDATE grocery_lists SET name = ?, updated_at = ? WHERE id = ?', [
        list.name,
        now,
        list.id,
      ]);
    }
  }
  return migrated;
}

export async function getAllLists(): Promise<GroceryList[]> {
  const __async = await routeToAsync('getAllLists');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM grocery_lists ORDER BY updated_at DESC');
  const lists = rows.map((r) => mapList(r as Record<string, unknown>));
  return applyLegacyListNameMigration(lists);
}

export async function getListById(id: string): Promise<GroceryList | null> {
  const __async = await routeToAsync('getListById', id);
  if (__async !== undefined) return __async as never;

  const lists = await getAllLists();
  return lists.find((list) => list.id === id) ?? null;
}

export async function getActiveList(): Promise<GroceryList | null> {
  const __async = await routeToAsync('getActiveList');
  if (__async !== undefined) return __async as never;

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
  const __async = await routeToAsync('createList', name, options);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = generateId();
  const lists = await getAllLists();
  const isFirst = lists.length === 0;
  const isActive = options.setActive ?? isFirst;
  await db.runAsync(
    `INSERT INTO grocery_lists
      (id, name, is_active, store_id, store_name, recurrence, layout_mode, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      isActive ? 1 : 0,
      options.storeId ?? null,
      options.storeName ?? null,
      options.recurrence ?? null,
      options.layoutMode ?? 'category',
      now,
      now,
    ]
  );
  if (isActive && !isFirst) {
    await setActiveList(id);
  }
  return {
    id,
    name,
    isActive,
    storeId: options.storeId,
    storeName: options.storeName,
    recurrence: options.recurrence,
    layoutMode: options.layoutMode ?? 'category',
    createdAt: now,
    updatedAt: now,
  };
}

export type UpdateListPatch = {
  name?: string;
  storeId?: string | null;
  storeName?: string | null;
  recurrence?: GroceryList['recurrence'] | null;
  layoutMode?: GroceryList['layoutMode'];
};

export async function updateList(id: string, name: string): Promise<void> {
  const __async = await routeToAsync('updateList', id, name);
  if (__async !== undefined) return __async as never;

  await patchList(id, { name });
}

export async function patchList(id: string, patch: UpdateListPatch): Promise<void> {
  const __async = await routeToAsync('patchList', id, patch);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const existing = await getListById(id);
  if (!existing) return;
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE grocery_lists SET name = ?, store_id = ?, store_name = ?, recurrence = ?, layout_mode = ?, updated_at = ? WHERE id = ?`,
    [
      patch.name ?? existing.name,
      patch.storeId !== undefined ? patch.storeId : existing.storeId ?? null,
      patch.storeName !== undefined ? patch.storeName : existing.storeName ?? null,
      patch.recurrence !== undefined ? patch.recurrence : existing.recurrence ?? null,
      patch.layoutMode ?? existing.layoutMode ?? 'category',
      now,
      id,
    ]
  );
}

export async function deleteList(id: string): Promise<void> {
  const __async = await routeToAsync('deleteList', id);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  await db.runAsync('DELETE FROM grocery_lists WHERE id = ?', [id]);
}

export async function setActiveList(id: string): Promise<void> {
  const __async = await routeToAsync('setActiveList', id);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE grocery_lists SET is_active = 0');
  await db.runAsync(
    'UPDATE grocery_lists SET is_active = 1, completed_at = NULL, updated_at = ? WHERE id = ?',
    [now, id]
  );
}

export async function markListCompleted(id: string): Promise<void> {
  const __async = await routeToAsync('markListCompleted', id);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE grocery_lists SET is_active = 0, completed_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );
}

export async function deactivateList(id: string): Promise<void> {
  const __async = await routeToAsync('deactivateList', id);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE grocery_lists SET is_active = 0, updated_at = ? WHERE id = ? AND is_active = 1',
    [now, id]
  );
}

// --- List Items ---

export async function getListItems(listId: string): Promise<ListItem[]> {
  const __async = await routeToAsync('getListItems', listId);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM list_items WHERE list_id = ? ORDER BY sort_order ASC, name ASC',
    [listId]
  );
  return rows.map((r) => mapListItem(r as Record<string, unknown>));
}

export async function createListItem(
  listId: string,
  data: Omit<ListItem, 'id' | 'listId' | 'sortOrder'> & { sortOrder?: number }
): Promise<ListItem> {
  const __async = await routeToAsync('createListItem', listId, data);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const id = generateId();
  const existing = await getListItems(listId);
  const sortOrder = data.sortOrder ?? existing.length;
  await db.runAsync(
    `INSERT INTO list_items
      (id, list_id, name, expected_price, quantity, category, store_preference, image_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      listId,
      data.name,
      data.expectedPrice,
      data.quantity,
      data.category,
      data.storePreference ?? null,
      data.imageUrl ?? null,
      sortOrder,
    ]
  );
  await db.runAsync('UPDATE grocery_lists SET updated_at = ? WHERE id = ?', [
    new Date().toISOString(),
    listId,
  ]);
  const active = await getActiveList();
  if (!active) {
    await setActiveList(listId);
  } else if (active.id !== listId && existing.length === 0) {
    const activeItems = await getListItems(active.id);
    if (activeItems.length === 0) {
      await setActiveList(listId);
    }
  }
  return {
    id,
    listId,
    name: data.name,
    expectedPrice: data.expectedPrice,
    quantity: data.quantity,
    category: data.category,
    storePreference: data.storePreference,
    imageUrl: data.imageUrl,
    sortOrder,
  };
}

export async function updateListItem(
  id: string,
  data: Partial<Omit<ListItem, 'id' | 'listId'>>
): Promise<void> {
  const __async = await routeToAsync('updateListItem', id, data);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const existing = await db.getFirstAsync('SELECT * FROM list_items WHERE id = ?', [id]);
  if (!existing) return;
  const row = existing as Record<string, unknown>;
  await db.runAsync(
    `UPDATE list_items SET name = ?, expected_price = ?, quantity = ?, category = ?,
     store_preference = ?, image_url = ?, sort_order = ? WHERE id = ?`,
    [
      String(data.name ?? row.name),
      Number(data.expectedPrice ?? row.expected_price),
      Number(data.quantity ?? row.quantity),
      String(data.category ?? row.category),
      data.storePreference !== undefined
        ? data.storePreference
        : (row.store_preference as string | null),
      data.imageUrl !== undefined ? data.imageUrl : (row.image_url as string | null),
      Number(data.sortOrder ?? row.sort_order),
      id,
    ]
  );
  await db.runAsync('UPDATE grocery_lists SET updated_at = ? WHERE id = ?', [
    new Date().toISOString(),
    String(row.list_id),
  ]);
}

export async function deleteListItem(id: string): Promise<void> {
  const __async = await routeToAsync('deleteListItem', id);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const existing = await db.getFirstAsync('SELECT list_id FROM list_items WHERE id = ?', [id]);
  await db.runAsync('DELETE FROM list_items WHERE id = ?', [id]);
  if (existing) {
    await db.runAsync('UPDATE grocery_lists SET updated_at = ? WHERE id = ?', [
      new Date().toISOString(),
      (existing as { list_id: string }).list_id,
    ]);
  }
}

export async function deleteListItems(ids: string[]): Promise<void> {
  const __async = await routeToAsync('deleteListItems', ids);
  if (__async !== undefined) return __async as never;

  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  const listIds = await db.getAllAsync<{ list_id: string }>(
    `SELECT DISTINCT list_id FROM list_items WHERE id IN (${placeholders})`,
    ids
  );
  await db.runAsync(`DELETE FROM list_items WHERE id IN (${placeholders})`, ids);
  const now = new Date().toISOString();
  for (const row of listIds) {
    await db.runAsync('UPDATE grocery_lists SET updated_at = ? WHERE id = ?', [now, row.list_id]);
  }
}

// --- Receipts ---

async function getItemsGroupedByReceiptId(
  db: SQLite.SQLiteDatabase,
  receiptIds: string[]
): Promise<Map<string, ReceiptItem[]>> {
  const grouped = new Map<string, ReceiptItem[]>();
  if (receiptIds.length === 0) return grouped;

  const placeholders = receiptIds.map(() => '?').join(',');
  const rows = await db.getAllAsync(
    `SELECT * FROM receipt_items WHERE receipt_id IN (${placeholders})`,
    receiptIds
  );
  for (const row of rows) {
    const item = mapReceiptItem(row as Record<string, unknown>);
    const bucket = grouped.get(item.receiptId) ?? [];
    bucket.push(item);
    grouped.set(item.receiptId, bucket);
  }
  return grouped;
}

async function migrateReceiptTotals(db: SQLite.SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ id: string; tax: number | null; total: number | null }>(
    'SELECT id, tax, total FROM receipts WHERE total IS NULL OR total <= 0'
  );
  const now = new Date().toISOString();
  for (const row of rows) {
    const items = await getReceiptItemsFromDb(db, row.id);
    if (items.length === 0) continue;
    const { subtotal, tax, total } = normalizeReceiptTotalsForSave(items, row.tax ?? undefined);
    await db.runAsync(
      'UPDATE receipts SET subtotal = ?, tax = ?, total = ?, updated_at = ? WHERE id = ?',
      [subtotal, tax, total, now, row.id]
    );
  }
}

async function getReceiptItemsFromDb(
  db: SQLite.SQLiteDatabase,
  receiptId: string
): Promise<ReceiptItem[]> {
  const rows = await db.getAllAsync('SELECT * FROM receipt_items WHERE receipt_id = ?', [receiptId]);
  return rows.map((r) => mapReceiptItem(r as Record<string, unknown>));
}

export async function getReceipts(filters?: ReceiptFilters): Promise<Receipt[]> {
  const __async = await routeToAsync('getReceipts', filters);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  let query = 'SELECT * FROM receipts WHERE 1=1';
  const params: (string | number)[] = [];
  if (filters?.storeName) {
    query += ' AND store_name LIKE ?';
    params.push(`%${filters.storeName}%`);
  }
  if (filters?.startDate) {
    query += ' AND date >= ?';
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    query += ' AND date <= ?';
    params.push(filters.endDate);
  }
  if (filters?.storeRegion) {
    query += ' AND UPPER(store_region) = ?';
    params.push(filters.storeRegion.trim().toUpperCase());
  }
  query += ' ORDER BY date DESC, created_at DESC';
  const rows = await db.getAllAsync(query, params);
  const receipts = rows.map((r) => mapReceipt(r as Record<string, unknown>));
  if (receipts.length === 0) return [];

  const itemsByReceipt = await getItemsGroupedByReceiptId(
    db,
    receipts.map((receipt) => receipt.id)
  );
  return receipts.map((receipt) =>
    applyReceiptTotals(receipt, itemsByReceipt.get(receipt.id))
  );
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  const __async = await routeToAsync('getReceiptById', id);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM receipts WHERE id = ?', [id]);
  if (!row) return null;
  const receipt = mapReceipt(row as Record<string, unknown>);
  const items = await getReceiptItems(id);
  return applyReceiptTotals({ ...receipt, items }, items);
}

export async function getReceiptItems(receiptId: string): Promise<ReceiptItem[]> {
  const __async = await routeToAsync('getReceiptItems', receiptId);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM receipt_items WHERE receipt_id = ?', [
    receiptId,
  ]);
  return rows.map((r) => mapReceiptItem(r as Record<string, unknown>));
}

export async function findDuplicateReceipt(
  storeName: string,
  date: string,
  total: number,
  excludeId?: string,
  storeRegion?: string | null
): Promise<Receipt | null> {
  const __async = await routeToAsync('findDuplicateReceipt', storeName, date, total, excludeId, storeRegion);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const normalizedStore = normalizeStoreForDuplicate(storeName);
  const normalizedRegion = storeRegion?.trim().toUpperCase();
  const rows = await db.getAllAsync('SELECT * FROM receipts WHERE date = ?', [date]);
  for (const row of rows) {
    const receipt = mapReceipt(row as Record<string, unknown>);
    if (excludeId && receipt.id === excludeId) continue;
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
  const __async = await routeToAsync('saveReceipt', receipt);
  if (__async !== undefined) return __async as never;

  const { assertCanSaveNewReceipt } = await import('@/src/services/scanLimitService');
  const { assertCanTrackStore } = await import('@/src/services/tierLimits');
  await assertCanSaveNewReceipt();
  await assertCanTrackStore(receipt.storeName);

  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = receipt.id || generateId();
  await db.runAsync(
    `INSERT INTO receipts (id, store_name, date, subtotal, tax, total, image_uri, linked_list_id, user_corrected,
     store_address, store_city, store_region, store_postal_code, store_country, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      receipt.storeName,
      receipt.date,
      receipt.subtotal ?? null,
      receipt.tax ?? null,
      receipt.total,
      receipt.imageUri,
      receipt.linkedListId ?? null,
      receipt.userCorrected ? 1 : 0,
      receipt.storeAddress ?? null,
      receipt.storeCity ?? null,
      receipt.storeRegion ?? null,
      receipt.storePostalCode ?? null,
      receipt.storeCountry ?? null,
      now,
      now,
    ]
  );
  for (const item of receipt.items) {
    const itemId = generateId();
    await db.runAsync(
      'INSERT INTO receipt_items (id, receipt_id, name, price, quantity, unit_price, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [itemId, id, item.name, item.price, item.quantity, item.unitPrice ?? null, item.unit ?? null]
    );
  }
  const { registerStoreFromReceipt } = await import('@/src/services/storeService');
  await registerStoreFromReceipt(receipt.storeName);
  const saved = {
    ...receipt,
    id,
    createdAt: now,
    updatedAt: now,
    items: receipt.items.map((item, i) => ({
      ...item,
      id: generateId(),
      receiptId: id,
    })),
  };
  const { contributeFromReceipt } = await import('@/src/services/crowdsourcedPricingService');
  await contributeFromReceipt(saved);
  const { syncPantryFromReceipt } = await import('@/src/services/pantryService');
  await syncPantryFromReceipt(saved, { quantityMode: 'increment' });
  return saved;
}

export async function updateReceipt(
  id: string,
  receipt: Partial<Omit<Receipt, 'items'>> & { items?: Array<Omit<ReceiptItem, 'receiptId'>> }
): Promise<void> {
  const __async = await routeToAsync('updateReceipt', id, receipt);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await getReceiptById(id);
  if (!existing) return;

  const nextStoreName = receipt.storeName ?? existing.storeName;
  if (nextStoreName.trim() && nextStoreName !== existing.storeName) {
    const { assertCanTrackStore } = await import('@/src/services/tierLimits');
    await assertCanTrackStore(nextStoreName);
  }

  await db.runAsync(
    `UPDATE receipts SET store_name = ?, date = ?, subtotal = ?, tax = ?, total = ?,
     image_uri = ?, linked_list_id = ?, user_corrected = ?,
     store_address = ?, store_city = ?, store_region = ?, store_postal_code = ?, store_country = ?,
     updated_at = ? WHERE id = ?`,
    [
      receipt.storeName ?? existing.storeName,
      receipt.date ?? existing.date,
      receipt.subtotal ?? existing.subtotal ?? null,
      receipt.tax ?? existing.tax ?? null,
      receipt.total ?? existing.total,
      receipt.imageUri ?? existing.imageUri,
      receipt.linkedListId !== undefined ? receipt.linkedListId : existing.linkedListId ?? null,
      receipt.userCorrected !== undefined ? (receipt.userCorrected ? 1 : 0) : existing.userCorrected ? 1 : 0,
      receipt.storeAddress !== undefined ? receipt.storeAddress ?? null : existing.storeAddress ?? null,
      receipt.storeCity !== undefined ? receipt.storeCity ?? null : existing.storeCity ?? null,
      receipt.storeRegion !== undefined ? receipt.storeRegion ?? null : existing.storeRegion ?? null,
      receipt.storePostalCode !== undefined
        ? receipt.storePostalCode ?? null
        : existing.storePostalCode ?? null,
      receipt.storeCountry !== undefined ? receipt.storeCountry ?? null : existing.storeCountry ?? null,
      now,
      id,
    ]
  );

  if (receipt.items) {
    await db.runAsync('DELETE FROM receipt_items WHERE receipt_id = ?', [id]);
    for (const item of receipt.items) {
      await db.runAsync(
        'INSERT INTO receipt_items (id, receipt_id, name, price, quantity, unit_price, unit) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          item.id || generateId(),
          id,
          item.name,
          item.price,
          item.quantity,
          item.unitPrice ?? null,
          item.unit ?? null,
        ]
      );
    }
  }
  const storeName = receipt.storeName ?? existing.storeName;
  const { registerStoreFromReceipt } = await import('@/src/services/storeService');
  await registerStoreFromReceipt(storeName);
  const updated = await getReceiptById(id);
  if (updated?.items) {
    const { syncPantryFromReceipt } = await import('@/src/services/pantryService');
    await syncPantryFromReceipt(updated, { quantityMode: 'set' });
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  const __async = await routeToAsync('deleteReceipt', id);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  await db.runAsync('DELETE FROM comparisons WHERE receipt_id = ?', [id]);
  await db.runAsync('DELETE FROM receipt_items WHERE receipt_id = ?', [id]);
  await db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
}

export async function deleteReceipts(ids: string[]): Promise<void> {
  const __async = await routeToAsync('deleteReceipts', ids);
  if (__async !== undefined) return __async as never;

  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM comparisons WHERE receipt_id IN (${placeholders})`, ids);
  await db.runAsync(`DELETE FROM receipt_items WHERE receipt_id IN (${placeholders})`, ids);
  await db.runAsync(`DELETE FROM receipts WHERE id IN (${placeholders})`, ids);
}

export async function linkReceiptToList(receiptId: string, listId: string): Promise<void> {
  const __async = await routeToAsync('linkReceiptToList', receiptId, listId);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  await db.runAsync('UPDATE receipts SET linked_list_id = ?, updated_at = ? WHERE id = ?', [
    listId,
    new Date().toISOString(),
    receiptId,
  ]);
}

// --- Comparisons ---

export async function saveComparison(
  comparison: Omit<Comparison, 'id' | 'createdAt'>,
  items: Array<Omit<ComparisonItem, 'id' | 'comparisonId'>>
): Promise<Comparison> {
  const __async = await routeToAsync('saveComparison', comparison, items);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO comparisons (id, receipt_id, list_id, planned_total, actual_total, variance, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, comparison.receiptId, comparison.listId, comparison.plannedTotal, comparison.actualTotal, comparison.variance, now]
  );
  for (const item of items) {
    await db.runAsync(
      `INSERT INTO comparison_items (id, comparison_id, list_item_id, receipt_item_id, match_type, name, planned_price, actual_price, variance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        id,
        item.listItemId ?? null,
        item.receiptItemId ?? null,
        item.matchType,
        item.name,
        item.plannedPrice ?? null,
        item.actualPrice ?? null,
        item.variance ?? null,
      ]
    );
  }
  return { ...comparison, id, createdAt: now };
}

export async function getComparisonByReceiptId(receiptId: string): Promise<Comparison | null> {
  const __async = await routeToAsync('getComparisonByReceiptId', receiptId);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM comparisons WHERE receipt_id = ?', [
    receiptId,
  ]);
  return row ? mapComparison(row as Record<string, unknown>) : null;
}

export async function getComparisonItems(comparisonId: string): Promise<ComparisonItem[]> {
  const __async = await routeToAsync('getComparisonItems', comparisonId);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM comparison_items WHERE comparison_id = ?', [
    comparisonId,
  ]);
  return rows.map((r) => mapComparisonItem(r as Record<string, unknown>));
}

export async function getLatestComparison(): Promise<(Comparison & { items: ComparisonItem[] }) | null> {
  const __async = await routeToAsync('getLatestComparison');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM comparisons ORDER BY created_at DESC LIMIT 1');
  if (!row) return null;
  const comparison = mapComparison(row as Record<string, unknown>);
  const items = await getComparisonItems(comparison.id);
  return { ...comparison, items };
}

export async function getAllComparisons(): Promise<Comparison[]> {
  const __async = await routeToAsync('getAllComparisons');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM comparisons ORDER BY created_at DESC');
  return rows.map((r) => mapComparison(r as Record<string, unknown>));
}

export async function deleteComparisonByReceiptId(receiptId: string): Promise<void> {
  const __async = await routeToAsync('deleteComparisonByReceiptId', receiptId);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const comparison = await getComparisonByReceiptId(receiptId);
  if (!comparison) return;
  await db.runAsync('DELETE FROM comparison_items WHERE comparison_id = ?', [comparison.id]);
  await db.runAsync('DELETE FROM comparisons WHERE id = ?', [comparison.id]);
}

// --- Budget ---

export async function getBudgetSettings(): Promise<BudgetSettings> {
  const __async = await routeToAsync('getBudgetSettings');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM budget_settings LIMIT 1');
  if (!row) {
    const now = new Date().toISOString();
    const id = generateId();
    await db.runAsync(
      'INSERT INTO budget_settings (id, weekly_budget, alert_threshold, updated_at) VALUES (?, ?, ?, ?)',
      [id, 150, 0.9, now]
    );
    return { id, weeklyBudget: 150, alertThreshold: 0.9, updatedAt: now };
  }
  const r = row as Record<string, unknown>;
  const weeklyBudget = r.weekly_budget as number;
  return {
    id: r.id as string,
    weeklyBudget,
    alertThreshold: r.alert_threshold as number,
    categoryLimits: parseCategoryLimits(r.category_limits, weeklyBudget),
    updatedAt: r.updated_at as string,
  };
}

export async function updateBudgetSettings(
  weeklyBudget: number,
  alertThreshold: number,
  categoryLimits?: CategoryLimits
): Promise<BudgetSettings> {
  const __async = await routeToAsync('updateBudgetSettings', weeklyBudget, alertThreshold, categoryLimits);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const existing = await getBudgetSettings();
  const now = new Date().toISOString();
  const limitsJson = categoryLimits ? JSON.stringify(categoryLimits) : null;
  await db.runAsync(
    'UPDATE budget_settings SET weekly_budget = ?, alert_threshold = ?, category_limits = ?, updated_at = ? WHERE id = ?',
    [weeklyBudget, alertThreshold, limitsJson, now, existing.id]
  );
  return {
    ...existing,
    weeklyBudget,
    alertThreshold,
    categoryLimits: categoryLimits ?? existing.categoryLimits,
    updatedAt: now,
  };
}

function mapAppSettings(row: Record<string, unknown>): AppSettings {
  return {
    id: row.id as string,
    displayName: row.display_name as string,
    notifyPriceAlerts: Boolean(row.notify_price_alerts),
    notifyBudgetAlerts: Boolean(row.notify_budget_alerts),
    enhancedCloudOcr: Boolean(row.enhanced_cloud_ocr),
    aiReceiptCleanup:
      row.ai_receipt_cleanup == null ? true : Boolean(row.ai_receipt_cleanup),
    updatedAt: row.updated_at as string,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const __async = await routeToAsync('getAppSettings');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM app_settings LIMIT 1');
  if (!row) {
    await seedAppSettings(db);
    const seeded = await db.getFirstAsync('SELECT * FROM app_settings LIMIT 1');
    return mapAppSettings(seeded as Record<string, unknown>);
  }
  return mapAppSettings(row as Record<string, unknown>);
}

export async function updateAppSettings(
  partial: Partial<Omit<AppSettings, 'id' | 'updatedAt'>>
): Promise<AppSettings> {
  const __async = await routeToAsync('updateAppSettings', partial);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const existing = await getAppSettings();
  const now = new Date().toISOString();
  const next: AppSettings = {
    ...existing,
    displayName: partial.displayName ?? existing.displayName,
    notifyPriceAlerts: partial.notifyPriceAlerts ?? existing.notifyPriceAlerts,
    notifyBudgetAlerts: partial.notifyBudgetAlerts ?? existing.notifyBudgetAlerts,
    enhancedCloudOcr: partial.enhancedCloudOcr ?? existing.enhancedCloudOcr,
    aiReceiptCleanup: partial.aiReceiptCleanup ?? existing.aiReceiptCleanup,
    updatedAt: now,
  };
  await db.runAsync(
    'UPDATE app_settings SET display_name = ?, notify_price_alerts = ?, notify_budget_alerts = ?, enhanced_cloud_ocr = ?, ai_receipt_cleanup = ?, updated_at = ? WHERE id = ?',
    [
      next.displayName,
      next.notifyPriceAlerts ? 1 : 0,
      next.notifyBudgetAlerts ? 1 : 0,
      next.enhancedCloudOcr ? 1 : 0,
      next.aiReceiptCleanup ? 1 : 0,
      now,
      existing.id,
    ]
  );
  return next;
}

export async function getReceiptsInDateRange(startDate: string, endDate: string): Promise<Receipt[]> {
  const __async = await routeToAsync('getReceiptsInDateRange', startDate, endDate);
  if (__async !== undefined) return __async as never;

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
  const __async = await routeToAsync('getReceiptItemsWithStore');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT ri.id, ri.receipt_id, ri.name, ri.price, ri.quantity, ri.unit_price, ri.unit,
            r.store_name, r.date AS receipt_date,
            r.store_region, r.store_postal_code, r.store_country
     FROM receipt_items ri
     INNER JOIN receipts r ON r.id = ri.receipt_id
     ORDER BY r.date DESC`
  );
  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      receiptId: r.receipt_id as string,
      name: r.name as string,
      price: r.price as number,
      quantity: r.quantity as number,
      unitPrice: r.unit_price != null ? (r.unit_price as number) : undefined,
      unit: (r.unit as string) || undefined,
      storeName: r.store_name as string,
      receiptDate: r.receipt_date as string,
      storeRegion: (r.store_region as string) || undefined,
      storePostalCode: (r.store_postal_code as string) || undefined,
      storeCountry: (r.store_country as string) || undefined,
    };
  });
}

export async function getDistinctStores(): Promise<string[]> {
  const __async = await routeToAsync('getDistinctStores');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync<{ store_name: string }>(
    'SELECT DISTINCT store_name FROM receipts ORDER BY store_name ASC'
  );
  return rows.map((r) => r.store_name);
}

export async function getDistinctRegions(): Promise<string[]> {
  const __async = await routeToAsync('getDistinctRegions');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync<{ store_region: string }>(
    `SELECT DISTINCT store_region FROM receipts
     WHERE store_region IS NOT NULL AND TRIM(store_region) != ''
     ORDER BY store_region ASC`
  );
  return rows.map((r) => r.store_region);
}

function mapCustomStore(row: Record<string, unknown>): StoreDefinition {
  return {
    id: row.id as string,
    name: row.name as string,
    brandColor: row.brand_color as string,
    initials: row.initials as string,
    logoUrl: row.logo_url as string,
    isCustom: true,
  };
}

export async function getCustomStores(): Promise<StoreDefinition[]> {
  const __async = await routeToAsync('getCustomStores');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM custom_stores ORDER BY name ASC');
  return rows.map((r) => mapCustomStore(r as Record<string, unknown>));
}

export async function saveCustomStore(store: StoreDefinition): Promise<void> {
  const __async = await routeToAsync('saveCustomStore', store);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO custom_stores (id, name, brand_color, initials, logo_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [store.id, store.name, store.brandColor, store.initials, store.logoUrl, now]
  );
}

function mapStorePreference(row: Record<string, unknown>): StorePreference {
  return {
    storeId: row.store_id as string,
    isFavorite: Boolean(row.is_favorite),
    isHidden: Boolean(row.is_hidden),
    region: (row.region as string) || undefined,
    updatedAt: row.updated_at as string,
  };
}

export async function getStorePreferences(): Promise<StorePreference[]> {
  const __async = await routeToAsync('getStorePreferences');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM store_preferences');
  return rows.map((row) => mapStorePreference(row as Record<string, unknown>));
}

export async function upsertStorePreference(input: {
  storeId: string;
  isFavorite?: boolean;
  isHidden?: boolean;
  region?: string | null;
}): Promise<StorePreference> {
  const __async = await routeToAsync('upsertStorePreference', input);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const existing = await db.getFirstAsync('SELECT * FROM store_preferences WHERE store_id = ?', [
    input.storeId,
  ]);
  const now = new Date().toISOString();
  const current = existing
    ? mapStorePreference(existing as Record<string, unknown>)
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
  await db.runAsync(
    `INSERT INTO store_preferences (store_id, is_favorite, is_hidden, region, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(store_id) DO UPDATE SET
       is_favorite = excluded.is_favorite,
       is_hidden = excluded.is_hidden,
       region = excluded.region,
       updated_at = excluded.updated_at`,
    [
      saved.storeId,
      saved.isFavorite ? 1 : 0,
      saved.isHidden ? 1 : 0,
      saved.region ?? null,
      saved.updatedAt,
    ]
  );
  return saved;
}

export async function deleteCustomStore(storeId: string): Promise<void> {
  const __async = await routeToAsync('deleteCustomStore', storeId);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  await db.runAsync('DELETE FROM custom_stores WHERE id = ?', [storeId]);
  await db.runAsync('DELETE FROM store_preferences WHERE store_id = ?', [storeId]);
}

function mapPriceAlertRule(row: Record<string, unknown>): PriceAlertRule {
  return {
    id: row.id as string,
    itemName: row.item_name as string,
    canonicalName: (row.canonical_name as string | null) ?? undefined,
    emoji: (row.emoji as string | null) ?? undefined,
    targetPrice: row.target_price as number,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at as string,
  };
}

export async function getPriceAlertRules(): Promise<PriceAlertRule[]> {
  const __async = await routeToAsync('getPriceAlertRules');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync(
    'SELECT * FROM price_alert_rules ORDER BY created_at DESC'
  );
  return rows.map((row) => mapPriceAlertRule(row as Record<string, unknown>));
}

export async function savePriceAlertRule(
  rule: Omit<PriceAlertRule, 'createdAt'> & { createdAt?: string }
): Promise<PriceAlertRule> {
  const __async = await routeToAsync('savePriceAlertRule', rule);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const id = rule.id || generateId();
  const createdAt = rule.createdAt ?? new Date().toISOString();
  const existing = await db.getFirstAsync('SELECT id FROM price_alert_rules WHERE id = ?', [id]);
  if (existing) {
    await db.runAsync(
      'UPDATE price_alert_rules SET item_name = ?, canonical_name = ?, emoji = ?, target_price = ?, enabled = ? WHERE id = ?',
      [rule.itemName, rule.canonicalName ?? null, rule.emoji ?? null, rule.targetPrice, rule.enabled ? 1 : 0, id]
    );
  } else {
    await db.runAsync(
      'INSERT INTO price_alert_rules (id, item_name, canonical_name, emoji, target_price, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, rule.itemName, rule.canonicalName ?? null, rule.emoji ?? null, rule.targetPrice, rule.enabled ? 1 : 0, createdAt]
    );
  }
  return {
    id,
    itemName: rule.itemName,
    canonicalName: rule.canonicalName,
    targetPrice: rule.targetPrice,
    enabled: rule.enabled,
    createdAt,
  };
}

export async function deletePriceAlertRule(id: string): Promise<void> {
  const __async = await routeToAsync('deletePriceAlertRule', id);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  await db.runAsync('DELETE FROM price_alert_rules WHERE id = ?', [id]);
}

export async function getDistinctItemNames(): Promise<string[]> {
  const __async = await routeToAsync('getDistinctItemNames');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string }>(
    'SELECT DISTINCT name FROM receipt_items ORDER BY name ASC'
  );
  const seen = new Map<string, string>();
  for (const row of rows) {
    const trimmed = row.name.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return Array.from(seen.values());
}

function mapPantryItem(row: Record<string, unknown>): PantryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    canonicalName: (row.canonical_name as string) || undefined,
    emoji: (row.emoji as string) || undefined,
    quantity: row.quantity as number,
    unit: (row.unit as string) || undefined,
    category: normalizePantryCategory(row.category as string | undefined),
    categoryUserSet: Boolean(row.category_user_set),
    lowStockThreshold:
      row.low_stock_threshold != null ? (row.low_stock_threshold as number) : undefined,
    shelfLifeDays: row.shelf_life_days != null ? (row.shelf_life_days as number) : undefined,
    addedDate: row.added_date as string,
    source: row.source as PantryItemSource,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function findPantryItemByCanonical(db: SQLite.SQLiteDatabase, canonicalKey: string): Promise<PantryItem | undefined> {
  const row = await db.getFirstAsync(
    `SELECT * FROM pantry_items
     WHERE lower(coalesce(canonical_name, name)) = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [canonicalKey]
  );
  return row ? mapPantryItem(row as Record<string, unknown>) : undefined;
}

export async function getPantryItems(): Promise<PantryItem[]> {
  const __async = await routeToAsync('getPantryItems');
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM pantry_items ORDER BY name ASC');
  return rows.map((row) => mapPantryItem(row as Record<string, unknown>));
}

export async function createPantryItem(
  data: Omit<PantryItem, 'id' | 'createdAt' | 'updatedAt' | 'source'> & { source?: PantryItemSource }
): Promise<PantryItem> {
  const __async = await routeToAsync('createPantryItem', data);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const now = new Date().toISOString();
  const canonicalKey = (data.canonicalName ?? data.name).trim().toLowerCase();
  const existing = await findPantryItemByCanonical(db, canonicalKey);
  if (existing) {
    return updatePantryItem(existing.id, {
      name: data.name,
      canonicalName: data.canonicalName,
      emoji: data.emoji,
      quantity: data.quantity,
      unit: data.unit,
      category: data.category,
      categoryUserSet: data.categoryUserSet ?? existing.categoryUserSet,
      lowStockThreshold: data.lowStockThreshold,
      shelfLifeDays: data.shelfLifeDays,
      addedDate: data.addedDate,
      source: data.source ?? 'manual',
    });
  }

  const { assertCanAddPantryItem } = await import('@/src/services/tierLimits');
  await assertCanAddPantryItem(canonicalKey);

  const id = generateId();
  const source = data.source ?? 'manual';
  await db.runAsync(
    `INSERT INTO pantry_items
      (id, name, canonical_name, emoji, quantity, unit, category, category_user_set, low_stock_threshold, shelf_life_days, added_date, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name,
      data.canonicalName ?? null,
      data.emoji ?? null,
      data.quantity,
      data.unit ?? null,
      data.category,
      data.categoryUserSet ? 1 : 0,
      data.lowStockThreshold ?? 3,
      data.shelfLifeDays ?? null,
      data.addedDate,
      source,
      now,
      now,
    ]
  );
  return {
    id,
    name: data.name,
    canonicalName: data.canonicalName,
    emoji: data.emoji,
    quantity: data.quantity,
    unit: data.unit,
    category: data.category,
    categoryUserSet: data.categoryUserSet ?? false,
    lowStockThreshold: data.lowStockThreshold ?? 3,
    shelfLifeDays: data.shelfLifeDays,
    addedDate: data.addedDate,
    source,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updatePantryItem(
  id: string,
  data: Partial<Omit<PantryItem, 'id' | 'createdAt'>>
): Promise<PantryItem> {
  const __async = await routeToAsync('updatePantryItem', id, data);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const existingRows = await db.getAllAsync('SELECT * FROM pantry_items WHERE id = ?', [id]);
  const existing = existingRows[0] as Record<string, unknown> | undefined;
  if (!existing) {
    throw new Error(`Pantry item not found: ${id}`);
  }
  const current = mapPantryItem(existing);
  const now = new Date().toISOString();
  const next: PantryItem = {
    ...current,
    ...data,
    updatedAt: now,
  };
  await db.runAsync(
    `UPDATE pantry_items
     SET name = ?, canonical_name = ?, emoji = ?, quantity = ?, unit = ?, category = ?, category_user_set = ?, low_stock_threshold = ?, shelf_life_days = ?, added_date = ?, source = ?, updated_at = ?
     WHERE id = ?`,
    [
      next.name,
      next.canonicalName ?? null,
      next.emoji ?? null,
      next.quantity,
      next.unit ?? null,
      next.category,
      next.categoryUserSet ? 1 : 0,
      next.lowStockThreshold ?? 3,
      next.shelfLifeDays ?? null,
      next.addedDate,
      next.source,
      now,
      id,
    ]
  );
  return next;
}

export async function deletePantryItem(id: string): Promise<void> {
  const __async = await routeToAsync('deletePantryItem', id);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  await db.runAsync('DELETE FROM pantry_items WHERE id = ?', [id]);
}

export async function deletePantryItems(ids: string[]): Promise<void> {
  const __async = await routeToAsync('deletePantryItems', ids);
  if (__async !== undefined) return __async as never;

  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM pantry_items WHERE id IN (${placeholders})`, ids);
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
  const __async = await routeToAsync('upsertPantryItemFromReceipt', input, quantityMode);
  if (__async !== undefined) return __async as never;

  const db = await getDatabase();
  const canonicalKey = (input.canonicalName ?? input.name).trim().toLowerCase();
  const existing = await findPantryItemByCanonical(db, canonicalKey);
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

export async function initStorage(): Promise<void> {
  await ensureStorageReady();
}

/** Wipes SQLite / async-backed grocery data and resets the storage init state. */
export async function wipeAllLocalData(): Promise<void> {
  await AsyncStorage.multiRemove([NATIVE_ASYNC_STORAGE_KEY, WEB_ASYNC_STORAGE_KEY]);

  const state = getDbInitState();
  if (state.instance) {
    try {
      await state.instance.closeAsync();
    } catch {
      /* best-effort */
    }
  }
  state.instance = null;
  state.promise = null;
  state.initialized = false;
  state.generation += 1;
  initPromise = null;
  storageMode = 'pending';

  try {
    await SQLite.deleteDatabaseAsync(DB_NAME);
  } catch {
    /* database may not exist */
  }

  asyncBackend.configureAsyncStorageKey(NATIVE_ASYNC_STORAGE_KEY);
}
