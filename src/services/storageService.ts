import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { DB_NAME, MIGRATIONS, SCHEMA_VERSION } from '@/src/models/schema';
import type {
  BudgetSettings,
  Comparison,
  ComparisonItem,
  GroceryList,
  ListItem,
  Receipt,
  ReceiptFilters,
  ReceiptItem,
} from '@/src/models/types';
import type { StoreDefinition } from '@/src/data/stores';
import { generateId } from '@/src/utils/id';

type DbInitState = {
  instance: SQLite.SQLiteDatabase | null;
  promise: Promise<SQLite.SQLiteDatabase> | null;
  initialized: boolean;
};

const DB_INIT_KEY = '__grocery_financial_db_init__';

function getDbInitState(): DbInitState {
  const globalState = globalThis as typeof globalThis & {
    [DB_INIT_KEY]?: DbInitState;
  };
  if (!globalState[DB_INIT_KEY]) {
    globalState[DB_INIT_KEY] = { instance: null, promise: null, initialized: false };
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

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await runMigrations(db);
  state.instance = db;
  state.initialized = true;
  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
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
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION]);
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO budget_settings (id, weekly_budget, alert_threshold, updated_at) VALUES (?, ?, ?, ?)',
      [generateId(), 150, 0.9, now]
    );
  }
}

function mapList(row: Record<string, unknown>): GroceryList {
  return {
    id: row.id as string,
    name: row.name as string,
    isActive: Boolean(row.is_active),
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

export async function getAllLists(): Promise<GroceryList[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM grocery_lists ORDER BY updated_at DESC');
  return rows.map((r) => mapList(r as Record<string, unknown>));
}

export async function getListById(id: string): Promise<GroceryList | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM grocery_lists WHERE id = ?', [id]);
  return row ? mapList(row as Record<string, unknown>) : null;
}

export async function getActiveList(): Promise<GroceryList | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM grocery_lists WHERE is_active = 1 LIMIT 1');
  return row ? mapList(row as Record<string, unknown>) : null;
}

export async function createList(name: string): Promise<GroceryList> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = generateId();
  const lists = await getAllLists();
  const isFirst = lists.length === 0;
  await db.runAsync(
    'INSERT INTO grocery_lists (id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, isFirst ? 1 : 0, now, now]
  );
  return { id, name, isActive: isFirst, createdAt: now, updatedAt: now };
}

export async function updateList(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE grocery_lists SET name = ?, updated_at = ? WHERE id = ?', [
    name,
    now,
    id,
  ]);
}

export async function deleteList(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM grocery_lists WHERE id = ?', [id]);
}

export async function setActiveList(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE grocery_lists SET is_active = 0');
  await db.runAsync('UPDATE grocery_lists SET is_active = 1, updated_at = ? WHERE id = ?', [
    now,
    id,
  ]);
}

// --- List Items ---

export async function getListItems(listId: string): Promise<ListItem[]> {
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
  const db = await getDatabase();
  const id = generateId();
  const existing = await getListItems(listId);
  const sortOrder = data.sortOrder ?? existing.length;
  await db.runAsync(
    `INSERT INTO list_items (id, list_id, name, expected_price, quantity, category, store_preference, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      listId,
      data.name,
      data.expectedPrice,
      data.quantity,
      data.category,
      data.storePreference ?? null,
      sortOrder,
    ]
  );
  await db.runAsync('UPDATE grocery_lists SET updated_at = ? WHERE id = ?', [
    new Date().toISOString(),
    listId,
  ]);
  return {
    id,
    listId,
    name: data.name,
    expectedPrice: data.expectedPrice,
    quantity: data.quantity,
    category: data.category,
    storePreference: data.storePreference,
    sortOrder,
  };
}

export async function updateListItem(
  id: string,
  data: Partial<Omit<ListItem, 'id' | 'listId'>>
): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync('SELECT * FROM list_items WHERE id = ?', [id]);
  if (!existing) return;
  const row = existing as Record<string, unknown>;
  await db.runAsync(
    `UPDATE list_items SET name = ?, expected_price = ?, quantity = ?, category = ?,
     store_preference = ?, sort_order = ? WHERE id = ?`,
    [
      String(data.name ?? row.name),
      Number(data.expectedPrice ?? row.expected_price),
      Number(data.quantity ?? row.quantity),
      String(data.category ?? row.category),
      data.storePreference !== undefined
        ? data.storePreference
        : (row.store_preference as string | null),
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

// --- Receipts ---

export async function getReceipts(filters?: ReceiptFilters): Promise<Receipt[]> {
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
  query += ' ORDER BY date DESC, created_at DESC';
  const rows = await db.getAllAsync(query, params);
  return rows.map((r) => mapReceipt(r as Record<string, unknown>));
}

export async function getReceiptById(id: string): Promise<Receipt | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM receipts WHERE id = ?', [id]);
  if (!row) return null;
  const receipt = mapReceipt(row as Record<string, unknown>);
  receipt.items = await getReceiptItems(id);
  return receipt;
}

export async function getReceiptItems(receiptId: string): Promise<ReceiptItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM receipt_items WHERE receipt_id = ?', [
    receiptId,
  ]);
  return rows.map((r) => mapReceiptItem(r as Record<string, unknown>));
}

export async function saveReceipt(
  receipt: Omit<Receipt, 'createdAt' | 'updatedAt' | 'items'> & {
    items: Array<Omit<ReceiptItem, 'id' | 'receiptId'>>;
  }
): Promise<Receipt> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = receipt.id || generateId();
  await db.runAsync(
    `INSERT INTO receipts (id, store_name, date, subtotal, tax, total, image_uri, linked_list_id, user_corrected, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      now,
      now,
    ]
  );
  for (const item of receipt.items) {
    const itemId = generateId();
    await db.runAsync(
      'INSERT INTO receipt_items (id, receipt_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)',
      [itemId, id, item.name, item.price, item.quantity]
    );
  }
  const { registerStoreFromReceipt } = await import('@/src/services/storeService');
  await registerStoreFromReceipt(receipt.storeName);
  return {
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
}

export async function updateReceipt(
  id: string,
  receipt: Partial<Receipt> & { items?: Array<Omit<ReceiptItem, 'receiptId'>> }
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const existing = await getReceiptById(id);
  if (!existing) return;

  await db.runAsync(
    `UPDATE receipts SET store_name = ?, date = ?, subtotal = ?, tax = ?, total = ?,
     image_uri = ?, linked_list_id = ?, user_corrected = ?, updated_at = ? WHERE id = ?`,
    [
      receipt.storeName ?? existing.storeName,
      receipt.date ?? existing.date,
      receipt.subtotal ?? existing.subtotal ?? null,
      receipt.tax ?? existing.tax ?? null,
      receipt.total ?? existing.total,
      receipt.imageUri ?? existing.imageUri,
      receipt.linkedListId !== undefined ? receipt.linkedListId : existing.linkedListId ?? null,
      receipt.userCorrected !== undefined ? (receipt.userCorrected ? 1 : 0) : existing.userCorrected ? 1 : 0,
      now,
      id,
    ]
  );

  if (receipt.items) {
    await db.runAsync('DELETE FROM receipt_items WHERE receipt_id = ?', [id]);
    for (const item of receipt.items) {
      await db.runAsync(
        'INSERT INTO receipt_items (id, receipt_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)',
        [item.id || generateId(), id, item.name, item.price, item.quantity]
      );
    }
  }
  const storeName = receipt.storeName ?? existing.storeName;
  const { registerStoreFromReceipt } = await import('@/src/services/storeService');
  await registerStoreFromReceipt(storeName);
}

export async function deleteReceipt(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM comparisons WHERE receipt_id = ?', [id]);
  await db.runAsync('DELETE FROM receipt_items WHERE receipt_id = ?', [id]);
  await db.runAsync('DELETE FROM receipts WHERE id = ?', [id]);
}

export async function linkReceiptToList(receiptId: string, listId: string): Promise<void> {
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
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM comparisons WHERE receipt_id = ?', [
    receiptId,
  ]);
  return row ? mapComparison(row as Record<string, unknown>) : null;
}

export async function getComparisonItems(comparisonId: string): Promise<ComparisonItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM comparison_items WHERE comparison_id = ?', [
    comparisonId,
  ]);
  return rows.map((r) => mapComparisonItem(r as Record<string, unknown>));
}

export async function getLatestComparison(): Promise<(Comparison & { items: ComparisonItem[] }) | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM comparisons ORDER BY created_at DESC LIMIT 1');
  if (!row) return null;
  const comparison = mapComparison(row as Record<string, unknown>);
  const items = await getComparisonItems(comparison.id);
  return { ...comparison, items };
}

export async function deleteComparisonByReceiptId(receiptId: string): Promise<void> {
  const db = await getDatabase();
  const comparison = await getComparisonByReceiptId(receiptId);
  if (!comparison) return;
  await db.runAsync('DELETE FROM comparison_items WHERE comparison_id = ?', [comparison.id]);
  await db.runAsync('DELETE FROM comparisons WHERE id = ?', [comparison.id]);
}

// --- Budget ---

export async function getBudgetSettings(): Promise<BudgetSettings> {
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
  return {
    id: r.id as string,
    weeklyBudget: r.weekly_budget as number,
    alertThreshold: r.alert_threshold as number,
    updatedAt: r.updated_at as string,
  };
}

export async function updateBudgetSettings(
  weeklyBudget: number,
  alertThreshold: number
): Promise<BudgetSettings> {
  const db = await getDatabase();
  const existing = await getBudgetSettings();
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE budget_settings SET weekly_budget = ?, alert_threshold = ?, updated_at = ? WHERE id = ?',
    [weeklyBudget, alertThreshold, now, existing.id]
  );
  return { ...existing, weeklyBudget, alertThreshold, updatedAt: now };
}

export async function getReceiptsInDateRange(startDate: string, endDate: string): Promise<Receipt[]> {
  return getReceipts({ startDate, endDate });
}

export type ReceiptItemWithStore = ReceiptItem & {
  storeName: string;
  receiptDate: string;
};

export async function getReceiptItemsWithStore(): Promise<ReceiptItemWithStore[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT ri.id, ri.receipt_id, ri.name, ri.price, ri.quantity,
            r.store_name, r.date AS receipt_date
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
      storeName: r.store_name as string,
      receiptDate: r.receipt_date as string,
    };
  });
}

export async function getDistinctStores(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ store_name: string }>(
    'SELECT DISTINCT store_name FROM receipts ORDER BY store_name ASC'
  );
  return rows.map((r) => r.store_name);
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
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM custom_stores ORDER BY name ASC');
  return rows.map((r) => mapCustomStore(r as Record<string, unknown>));
}

export async function saveCustomStore(store: StoreDefinition): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT OR IGNORE INTO custom_stores (id, name, brand_color, initials, logo_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [store.id, store.name, store.brandColor, store.initials, store.logoUrl, now]
  );
}

export async function initStorage(): Promise<void> {
  await getDatabase();
}
