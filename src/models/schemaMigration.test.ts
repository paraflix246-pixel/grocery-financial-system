import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SCHEMA_VERSION } from '@/src/models/schema';
import type { GroceryList, ListItem, PantryItem, ReceiptItem } from '@/src/models/types';
import { inferPantryCategory } from '@/src/utils/pantryCategory';
import { formatPantryQuantity } from '@/src/utils/pantryQuantity';

function mapReceiptItemFromRow(row: Record<string, unknown>): ReceiptItem {
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

function mapPantryItemFromRow(row: Record<string, unknown>): PantryItem {
  return {
    id: row.id as string,
    name: row.name as string,
    canonicalName: (row.canonical_name as string) || undefined,
    emoji: (row.emoji as string) || undefined,
    quantity: row.quantity as number,
    unit: (row.unit as string) || undefined,
    category: (row.category as string) || inferPantryCategory(row.name as string, row.canonical_name as string | undefined),
    lowStockThreshold:
      row.low_stock_threshold != null ? (row.low_stock_threshold as number) : undefined,
    shelfLifeDays: row.shelf_life_days != null ? (row.shelf_life_days as number) : undefined,
    addedDate: row.added_date as string,
    source: row.source as PantryItem['source'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapGroceryListFromRow(row: Record<string, unknown>): GroceryList {
  return {
    id: row.id as string,
    name: row.name as string,
    isActive: Boolean(row.is_active),
    storeId: (row.store_id as string) || undefined,
    storeName: (row.store_name as string) || undefined,
    recurrence: (row.recurrence as GroceryList['recurrence']) || undefined,
    layoutMode: (row.layout_mode as GroceryList['layoutMode']) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapListItemFromRow(row: Record<string, unknown>): ListItem {
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

describe('schema v16 list metadata', () => {
  it('uses schema version 21', () => {
    assert.equal(SCHEMA_VERSION, 24);
  });

  it('maps grocery list store and layout fields', () => {
    const list = mapGroceryListFromRow({
      id: 'list-1',
      name: 'Weekly Walmart',
      is_active: 1,
      store_id: 'walmart',
      store_name: 'Walmart',
      recurrence: 'weekly',
      layout_mode: 'store',
      created_at: '2026-06-08T00:00:00.000Z',
      updated_at: '2026-06-08T00:00:00.000Z',
    });
    assert.equal(list.storeId, 'walmart');
    assert.equal(list.storeName, 'Walmart');
    assert.equal(list.recurrence, 'weekly');
    assert.equal(list.layoutMode, 'store');
  });

  it('maps list item image url field', () => {
    const item = mapListItemFromRow({
      id: 'item-1',
      list_id: 'list-1',
      name: 'Bananas',
      expected_price: 1.29,
      quantity: 1,
      category: 'Produce',
      store_preference: null,
      image_url: 'https://example.com/banana.png',
      sort_order: 0,
    });
    assert.equal(item.imageUrl, 'https://example.com/banana.png');
  });
});

describe('schema v15 store preferences', () => {
  it('uses schema version 15 or newer', () => {
    assert.ok(SCHEMA_VERSION >= 15);
  });
});

describe('schema v14 pantry item mapping', () => {
  it('uses schema version 14 or newer', () => {
    assert.ok(SCHEMA_VERSION >= 14);
  });

  it('maps shelf life days field', () => {
    const item = mapPantryItemFromRow({
      id: 'pantry-4',
      name: 'Milk',
      canonical_name: 'Milk',
      emoji: '🥛',
      quantity: 1,
      unit: 'gal',
      category: 'Dairy',
      low_stock_threshold: 2,
      shelf_life_days: 7,
      added_date: '2026-06-08',
      source: 'manual',
      created_at: '2026-06-08T00:00:00.000Z',
      updated_at: '2026-06-08T00:00:00.000Z',
    });
    assert.equal(item.shelfLifeDays, 7);
  });
});

describe('schema v13 pantry item mapping', () => {
  it('uses schema version 13 or newer', () => {
    assert.ok(SCHEMA_VERSION >= 13);
  });

  it('maps low stock threshold field', () => {
    const item = mapPantryItemFromRow({
      id: 'pantry-3',
      name: 'Eggs',
      canonical_name: 'Eggs',
      emoji: '🥚',
      quantity: 2,
      unit: 'dozen',
      category: 'Dairy',
      low_stock_threshold: 2,
      added_date: '2026-06-08',
      source: 'manual',
      created_at: '2026-06-08T00:00:00.000Z',
      updated_at: '2026-06-08T00:00:00.000Z',
    });
    assert.equal(item.lowStockThreshold, 2);
  });
});

describe('schema v12 pantry item mapping', () => {
  it('uses schema version 12 or newer', () => {
    assert.ok(SCHEMA_VERSION >= 12);
  });

  it('maps pantry item category field', () => {
    const item = mapPantryItemFromRow({
      id: 'pantry-1',
      name: 'Milk',
      canonical_name: 'Milk',
      emoji: '🥛',
      quantity: 2,
      unit: 'gal',
      category: 'Dairy',
      added_date: '2026-06-08',
      source: 'manual',
      created_at: '2026-06-08T00:00:00.000Z',
      updated_at: '2026-06-08T00:00:00.000Z',
    });
    assert.equal(item.category, 'Dairy');
  });

  it('infers category when column is missing on legacy rows', () => {
    const item = mapPantryItemFromRow({
      id: 'pantry-2',
      name: 'Milk',
      canonical_name: 'Milk',
      emoji: '🥛',
      quantity: 1,
      unit: null,
      category: null,
      added_date: '2026-06-08',
      source: 'manual',
      created_at: '2026-06-08T00:00:00.000Z',
      updated_at: '2026-06-08T00:00:00.000Z',
    });
    assert.equal(item.category, 'Dairy');
  });
});

describe('schema v11 pantry item mapping', () => {
  it('maps pantry item quantity and unit fields', () => {
    const item = mapPantryItemFromRow({
      id: 'pantry-1',
      name: 'Milk',
      canonical_name: 'Milk',
      emoji: '🥛',
      quantity: 2,
      unit: 'gal',
      category: 'Dairy',
      added_date: '2026-06-08',
      source: 'manual',
      created_at: '2026-06-08T00:00:00.000Z',
      updated_at: '2026-06-08T00:00:00.000Z',
    });
    assert.equal(item.quantity, 2);
    assert.equal(item.unit, 'gal');
    assert.equal(item.source, 'manual');
  });
});

describe('schema v10 receipt item mapping', () => {
  it('maps missing unit columns as undefined for legacy rows', () => {
    const item = mapReceiptItemFromRow({
      id: 'item-1',
      receipt_id: 'receipt-1',
      name: 'Milk',
      price: 3.99,
      quantity: 1,
      unit_price: null,
      unit: null,
    });
    assert.equal(item.unitPrice, undefined);
    assert.equal(item.unit, undefined);
  });

  it('maps unit price fields when present', () => {
    const item = mapReceiptItemFromRow({
      id: 'item-2',
      receipt_id: 'receipt-1',
      name: 'Bananas',
      price: 1.48,
      quantity: 1,
      unit_price: 0.59,
      unit: 'lb',
    });
    assert.equal(item.unitPrice, 0.59);
    assert.equal(item.unit, 'lb');
  });
});

describe('formatPantryQuantity', () => {
  it('formats quantity with unit', () => {
    assert.equal(formatPantryQuantity({ name: 'Milk', quantity: 2, unit: 'gal' }), '2 gal');
    assert.equal(formatPantryQuantity({ name: 'Eggs', quantity: 1, unit: 'dozen' }), '1 dozen');
  });
});

describe('inferPantryCategory', () => {
  it('matches grocery catalog entries', () => {
    assert.equal(inferPantryCategory('whole milk', 'Milk'), 'Dairy');
  });

  it('falls back to spending heuristics', () => {
    assert.equal(inferPantryCategory('paper towels'), 'Household');
  });
});
