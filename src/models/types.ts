export type ListRecurrence = 'weekly' | 'monthly';

export type ListLayoutMode = 'category' | 'store';

export type GroceryList = {
  id: string;
  name: string;
  isActive: boolean;
  /** ISO timestamp when the user marked the list complete. */
  completedAt?: string;
  storeId?: string;
  storeName?: string;
  recurrence?: ListRecurrence;
  layoutMode?: ListLayoutMode;
  createdAt: string;
  updatedAt: string;
};

export type ListItem = {
  id: string;
  listId: string;
  name: string;
  expectedPrice: number;
  quantity: number;
  category: string;
  storePreference?: string;
  imageUrl?: string;
  sortOrder: number;
};

/** How a scanned receipt row should be shown and counted toward totals. */
export type ReceiptLineKind = 'merchandise' | 'fee' | 'other';

export type ReceiptItem = {
  id: string;
  receiptId: string;
  name: string;
  price: number;
  quantity: number;
  /** Normalized unit price when printed (e.g. per lb). */
  unitPrice?: number;
  /** Unit label: lb, oz, ea, L, gal, kg, g */
  unit?: string;
  lineKind?: ReceiptLineKind;
};

export type StoreLocation = {
  storeAddress?: string;
  storeCity?: string;
  /** US state or Canadian province code (e.g. TX, ON). */
  storeRegion?: string;
  storePostalCode?: string;
  storeCountry?: 'US' | 'CA' | string;
};

export type Receipt = {
  id: string;
  storeName: string;
  date: string;
  subtotal?: number;
  tax?: number;
  total: number;
  imageUri: string;
  linkedListId?: string;
  userCorrected: boolean;
  createdAt: string;
  updatedAt: string;
  items?: ReceiptItem[];
} & StoreLocation;

export type MatchType = 'matched' | 'missing' | 'extra';

export type Comparison = {
  id: string;
  receiptId: string;
  listId: string;
  plannedTotal: number;
  actualTotal: number;
  variance: number;
  createdAt: string;
};

export type ComparisonItem = {
  id: string;
  comparisonId: string;
  listItemId?: string;
  receiptItemId?: string;
  matchType: MatchType;
  name: string;
  plannedPrice?: number;
  actualPrice?: number;
  variance?: number;
};

export type ComparisonResult = {
  plannedTotal: number;
  actualTotal: number;
  variance: number;
  items: Array<{
    name: string;
    matchType: MatchType;
    plannedPrice?: number;
    actualPrice?: number;
    variance?: number;
  }>;
};

export const BUDGET_CATEGORIES = ['Groceries', 'Household', 'Snacks', 'Beverages'] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export type CategoryLimits = Record<BudgetCategory, number>;

export type BudgetSettings = {
  id: string;
  weeklyBudget: number;
  alertThreshold: number;
  categoryLimits?: CategoryLimits;
  updatedAt: string;
};

export type AppSettings = {
  id: string;
  displayName: string;
  notifyPriceAlerts: boolean;
  notifyBudgetAlerts: boolean;
  enhancedCloudOcr: boolean;
  aiReceiptCleanup: boolean;
  updatedAt: string;
};

export type PriceAlertRule = {
  id: string;
  itemName: string;
  canonicalName?: string;
  emoji?: string;
  targetPrice: number;
  enabled: boolean;
  createdAt: string;
};

export type PantryItemSource = 'receipt' | 'manual';

export type PantryItem = {
  id: string;
  name: string;
  canonicalName?: string;
  emoji?: string;
  quantity: number;
  unit?: string;
  category: string;
  /** When true, receipt sync will not overwrite the user-chosen category. */
  categoryUserSet?: boolean;
  /** Alert when quantity is at or below this value (default 3). */
  lowStockThreshold?: number;
  /** Days from addedDate until expiry. Omitted to infer for perishables; 0 = no expiry. */
  shelfLifeDays?: number;
  addedDate: string;
  source: PantryItemSource;
  createdAt: string;
  updatedAt: string;
};

export type ParsedReceiptDraft = {
  storeName: string;
  date: string;
  /** Store number when printed (e.g. "STORE 3156"). */
  storeNumber?: string;
  subtotal?: number;
  tax?: number;
  /** Printed tax rate from receipt footer (e.g. 13 for "HST (13%)"). */
  printedTaxRate?: number;
  total: number;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    unitPrice?: number;
    unit?: string;
    lineKind?: ReceiptLineKind;
  }>;
} & StoreLocation;

export type ReceiptFilters = {
  storeName?: string;
  storeRegion?: string;
  startDate?: string;
  endDate?: string;
};

/** Per-user store list preferences (favorites, hidden catalog entries, region). */
export type StorePreference = {
  storeId: string;
  isFavorite: boolean;
  isHidden: boolean;
  region?: string;
  updatedAt: string;
};
