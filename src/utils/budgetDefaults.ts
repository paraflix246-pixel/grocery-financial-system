import type { BudgetCategory, CategoryLimits } from '@/src/models/types';
import { BUDGET_CATEGORIES } from '@/src/models/types';

const CATEGORY_SHARES: Record<BudgetCategory, number> = {
  Groceries: 0.5,
  Household: 0.2,
  Snacks: 0.15,
  Beverages: 0.15,
};

export function defaultCategoryLimits(monthlyBudget: number): CategoryLimits {
  return BUDGET_CATEGORIES.reduce(
    (limits, category) => ({
      ...limits,
      [category]: Math.round(monthlyBudget * CATEGORY_SHARES[category] * 100) / 100,
    }),
    {} as CategoryLimits
  );
}

export function resolveCategoryLimits(
  monthlyBudget: number,
  stored?: Partial<CategoryLimits> | null
): CategoryLimits {
  const defaults = defaultCategoryLimits(monthlyBudget);
  if (!stored) return defaults;
  return BUDGET_CATEGORIES.reduce(
    (limits, category) => ({
      ...limits,
      [category]: stored[category] ?? defaults[category],
    }),
    {} as CategoryLimits
  );
}
