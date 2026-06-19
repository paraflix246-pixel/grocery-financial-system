export type GroceryList = {
  id: string;
  name: string;
  isActive: boolean;
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
  sortOrder: number;
};

export type ReceiptItem = {
  id: string;
  receiptId: string;
  name: string;
  price: number;
  quantity: number;
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
};

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
  updatedAt: string;
};

export type ParsedReceiptDraft = {
  storeName: string;
  date: string;
  subtotal?: number;
  tax?: number;
  total: number;
  items: Array<{ name: string; price: number; quantity: number }>;
};

export type ReceiptFilters = {
  storeName?: string;
  startDate?: string;
  endDate?: string;
};
