import type { PantryInsightCard } from '@/src/services/pantryInsightService';

/** Limit pantry insight detail for free-tier users (teaser counts without item names). */
export function applyPantryInsightTierLimit(
  insights: PantryInsightCard[],
  hasFullAccess: boolean
): PantryInsightCard[] {
  if (hasFullAccess) return insights;

  return insights.map((insight) => {
    if (insight.id === 'low-stock') {
      return {
        ...insight,
        subtitleKey: 'pantryInsights.lowStock.subtitleTeaser',
        subtitleParams: undefined,
      };
    }

    if (insight.id === 'expiry-risk') {
      const count = Number(insight.valueParams?.count ?? 0);
      return {
        ...insight,
        subtitleKey:
          count === 1
            ? 'pantryInsights.expiryRisk.subtitleTeaserOne'
            : 'pantryInsights.expiryRisk.subtitleTeaserMany',
        subtitleParams: { count },
      };
    }

    if (insight.id === 'repeat-purchase') {
      return {
        ...insight,
        valueKey: 'pantryInsights.repeatPurchase.valueTeaser',
        valueParams: { count: insight.subtitleParams?.count ?? 0 },
        subtitleKey: 'pantryInsights.repeatPurchase.subtitleTeaser',
        subtitleParams: undefined,
      };
    }

    if (insight.id === 'category-spend-delta') {
      return {
        ...insight,
        subtitleKey: 'pantryInsights.spendDelta.subtitleTeaser',
        subtitleParams: undefined,
      };
    }

    return insight;
  });
}
