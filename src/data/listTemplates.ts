export type ListTemplate = {
  id: string;
  name: string;
  storeId?: string;
  storeName?: string;
  recurrence?: 'weekly' | 'monthly';
};

export const LIST_TEMPLATES: ListTemplate[] = [
  { id: 'weekly-walmart', name: 'Weekly Walmart', storeId: 'walmart', storeName: 'Walmart', recurrence: 'weekly' },
  { id: 'monthly-costco', name: 'Monthly Costco', storeId: 'costco', storeName: 'Costco', recurrence: 'monthly' },
  { id: 'trader-joes', name: "Trader Joe's", storeId: 'trader-joes', storeName: "Trader Joe's" },
  { id: 'patel-brothers', name: 'Patel Brothers', storeName: 'Patel Brothers' },
  { id: 'general', name: 'General Groceries' },
];
