import type { Receipt } from '@/src/models/types';
import type { PantryItemView } from '@/src/services/pantryService';
import { formatCurrency } from '@/src/utils/priceParser';

export type PantryInsightCard = {
  id: string;
  titleKey: string;
  valueKey: string;
  valueParams?: Record<string, string | number>;
  subtitleKey: string;
  subtitleParams?: Record<string, string | number>;
  variant: 'default' | 'warning' | 'success';
};

function sumReceiptSpend(receipts: Receipt[]): number {
  let total = 0;
  for (const receipt of receipts) {
    for (const item of receipt.items ?? []) {
      total += item.price * (item.quantity ?? 1);
    }
  }
  return total;
}

function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

/** Rules-based pantry insights (Phase A — no LLM). Returns i18n keys for UI translation. */
export function buildPantryInsights(input: {
  pantryItems: PantryItemView[];
  receipts: Receipt[];
  now?: Date;
}): PantryInsightCard[] {
  const now = input.now ?? new Date();
  const cards: PantryInsightCard[] = [];

  const expiringSoon = input.pantryItems.filter((item) => {
    const days = item.daysUntilExpiry;
    return days != null && days >= 0 && days <= 3;
  });
  if (expiringSoon.length > 0) {
    const names = expiringSoon
      .slice(0, 2)
      .map((item) => item.name)
      .join(', ');
    cards.push({
      id: 'expiry-risk',
      titleKey: 'pantryInsights.expiryRisk.title',
      valueKey: 'pantryInsights.expiryRisk.value',
      valueParams: { count: expiringSoon.length },
      subtitleKey:
        expiringSoon.length === 1
          ? 'pantryInsights.expiryRisk.subtitleOne'
          : 'pantryInsights.expiryRisk.subtitleMany',
      subtitleParams: {
        names,
        extra: Math.max(0, expiringSoon.length - 2),
      },
      variant: 'warning',
    });
  }

  const repeatMap = new Map<string, number>();
  for (const receipt of input.receipts) {
    for (const item of receipt.items ?? []) {
      const key = item.name.trim().toLowerCase();
      if (!key) continue;
      repeatMap.set(key, (repeatMap.get(key) ?? 0) + 1);
    }
  }
  const topRepeat = [...repeatMap.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topRepeat && topRepeat[1] >= 3) {
    const displayName = topRepeat[0].replace(/\b\w/g, (c) => c.toUpperCase());
    cards.push({
      id: 'repeat-purchase',
      titleKey: 'pantryInsights.repeatPurchase.title',
      valueKey: 'pantryInsights.repeatPurchase.value',
      valueParams: { name: displayName },
      subtitleKey: 'pantryInsights.repeatPurchase.subtitle',
      subtitleParams: { count: topRepeat[1] },
      variant: 'default',
    });
  }

  const currentMonth = monthKey(now.toISOString());
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = monthKey(prevMonthDate.toISOString());

  const groceriesNow = sumReceiptSpend(
    input.receipts.filter((r) => monthKey(r.date) === currentMonth)
  );
  const groceriesPrev = sumReceiptSpend(
    input.receipts.filter((r) => monthKey(r.date) === previousMonth)
  );

  if (groceriesNow > 0 && groceriesPrev > 0) {
    const delta = groceriesNow - groceriesPrev;
    const pct = Math.round((delta / groceriesPrev) * 100);
    if (Math.abs(pct) >= 8) {
      cards.push({
        id: 'category-spend-delta',
        titleKey: 'pantryInsights.spendDelta.title',
        valueKey: 'pantryInsights.spendDelta.value',
        valueParams: { pctLabel: `${pct > 0 ? '+' : ''}${pct}%` },
        subtitleKey: 'pantryInsights.spendDelta.subtitle',
        subtitleParams: {
          current: formatCurrency(groceriesNow),
          previous: formatCurrency(groceriesPrev),
        },
        variant: pct > 15 ? 'warning' : pct < -5 ? 'success' : 'default',
      });
    }
  }

  const lowStock = input.pantryItems.filter(
    (item) => item.status === 'running_low' || item.status === 'expiring_soon'
  );
  if (lowStock.length > 0 && cards.length < 4) {
    cards.push({
      id: 'low-stock',
      titleKey: 'pantryInsights.lowStock.title',
      valueKey: 'pantryInsights.lowStock.value',
      valueParams: { count: lowStock.length },
      subtitleKey: 'pantryInsights.lowStock.subtitle',
      subtitleParams: {
        names: lowStock
          .slice(0, 2)
          .map((item) => item.name)
          .join(', '),
      },
      variant: 'warning',
    });
  }

  return cards.slice(0, 4);
}
