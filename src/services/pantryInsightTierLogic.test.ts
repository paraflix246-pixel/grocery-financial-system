import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PantryInsightCard } from '@/src/services/pantryInsightService';
import { applyPantryInsightTierLimit } from '@/src/services/pantryInsightTierLogic';

const lowStockInsight: PantryInsightCard = {
  id: 'low-stock',
  titleKey: 'pantryInsights.lowStock.title',
  valueKey: 'pantryInsights.lowStock.value',
  valueParams: { count: 3 },
  subtitleKey: 'pantryInsights.lowStock.subtitle',
  subtitleParams: { names: 'Bread, Eggs' },
  variant: 'warning',
};

describe('applyPantryInsightTierLimit', () => {
  it('returns full insights for Pro scope', () => {
    const limited = applyPantryInsightTierLimit([lowStockInsight], true);
    assert.equal(limited[0]?.subtitleKey, 'pantryInsights.lowStock.subtitle');
    assert.deepEqual(limited[0]?.subtitleParams, { names: 'Bread, Eggs' });
  });

  it('hides item names for free tier running-low insight', () => {
    const limited = applyPantryInsightTierLimit([lowStockInsight], false);
    assert.equal(limited[0]?.valueParams?.count, 3);
    assert.equal(limited[0]?.subtitleKey, 'pantryInsights.lowStock.subtitleTeaser');
    assert.equal(limited[0]?.subtitleParams, undefined);
  });

  it('teasers expiry-risk names for free tier', () => {
    const insight: PantryInsightCard = {
      id: 'expiry-risk',
      titleKey: 'pantryInsights.expiryRisk.title',
      valueKey: 'pantryInsights.expiryRisk.value',
      valueParams: { count: 2 },
      subtitleKey: 'pantryInsights.expiryRisk.subtitleMany',
      subtitleParams: { names: 'Milk, Yogurt', extra: 0 },
      variant: 'warning',
    };
    const limited = applyPantryInsightTierLimit([insight], false);
    assert.equal(limited[0]?.subtitleKey, 'pantryInsights.expiryRisk.subtitleTeaserMany');
    assert.deepEqual(limited[0]?.subtitleParams, { count: 2 });
  });
});
