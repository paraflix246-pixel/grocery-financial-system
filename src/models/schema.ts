export const DB_NAME = 'grocery_financial.db';
export const SCHEMA_VERSION = 3;

export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS grocery_lists (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS list_items (
    id TEXT PRIMARY KEY NOT NULL,
    list_id TEXT NOT NULL,
    name TEXT NOT NULL,
    expected_price REAL NOT NULL DEFAULT 0,
    quantity REAL NOT NULL DEFAULT 1,
    category TEXT NOT NULL DEFAULT 'Other',
    store_preference TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY NOT NULL,
    store_name TEXT NOT NULL,
    date TEXT NOT NULL,
    subtotal REAL,
    tax REAL,
    total REAL NOT NULL,
    image_uri TEXT NOT NULL,
    linked_list_id TEXT,
    user_corrected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (linked_list_id) REFERENCES grocery_lists(id) ON DELETE SET NULL
  );`,
  `CREATE TABLE IF NOT EXISTS receipt_items (
    id TEXT PRIMARY KEY NOT NULL,
    receipt_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS comparisons (
    id TEXT PRIMARY KEY NOT NULL,
    receipt_id TEXT NOT NULL,
    list_id TEXT NOT NULL,
    planned_total REAL NOT NULL,
    actual_total REAL NOT NULL,
    variance REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS comparison_items (
    id TEXT PRIMARY KEY NOT NULL,
    comparison_id TEXT NOT NULL,
    list_item_id TEXT,
    receipt_item_id TEXT,
    match_type TEXT NOT NULL,
    name TEXT NOT NULL,
    planned_price REAL,
    actual_price REAL,
    variance REAL,
    FOREIGN KEY (comparison_id) REFERENCES comparisons(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS budget_settings (
    id TEXT PRIMARY KEY NOT NULL,
    weekly_budget REAL NOT NULL DEFAULT 150,
    alert_threshold REAL NOT NULL DEFAULT 0.9,
    updated_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items(list_id);`,
  `CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON receipt_items(receipt_id);`,
  `CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date);`,
  `CREATE INDEX IF NOT EXISTS idx_comparisons_receipt_id ON comparisons(receipt_id);`,
  `CREATE TABLE IF NOT EXISTS custom_stores (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    brand_color TEXT NOT NULL,
    initials TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    notify_price_alerts INTEGER NOT NULL DEFAULT 1,
    notify_budget_alerts INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );`,
];
