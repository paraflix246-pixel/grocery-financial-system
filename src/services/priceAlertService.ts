import type { PriceAlertRule } from '@/src/models/types';
import { getPriceAlerts, type PriceAlert } from '@/src/services/analyticsService';
import { itemMatchesAlertRule } from '@/src/services/itemNormalizationService';
import {
  getPriceAlertRules,
  getReceiptItemsWithStore,
} from '@/src/services/storageService';

function itemEmoji(name: string): string {
  const lower = name.toLowerCase();
  if (/milk/.test(lower)) return '🥛';
  if (/banana|apple|fruit|berry/.test(lower)) return '🍌';
  if (/bread|bagel|bun/.test(lower)) return '🍞';
  if (/cereal|cheerio|oat/.test(lower)) return '🥣';
  if (/egg/.test(lower)) return '🥚';
  if (/chicken|meat|beef/.test(lower)) return '🍗';
  if (/coffee|tea/.test(lower)) return '☕';
  return '🛒';
}

export async function getCustomRuleAlerts(): Promise<PriceAlert[]> {
  const rules = await getPriceAlertRules();
  const enabledRules = rules.filter((rule) => rule.enabled);
  if (enabledRules.length === 0) return [];

  const items = await getReceiptItemsWithStore();
  const alerts: PriceAlert[] = [];

  for (const rule of enabledRules) {
    const matching = items.filter((item) => itemMatchesAlertRule(rule, item.name));
    if (matching.length === 0) continue;

    matching.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
    const latest = matching[0];
    if (latest.price > rule.targetPrice) continue;

    alerts.push({
      itemName: latest.name,
      store: latest.storeName,
      oldPrice: rule.targetPrice,
      newPrice: latest.price,
      percentDrop:
        rule.targetPrice > 0 ? ((rule.targetPrice - latest.price) / rule.targetPrice) * 100 : 0,
      emoji: itemEmoji(latest.name),
      source: 'custom',
      ruleId: rule.id,
      targetPrice: rule.targetPrice,
    });
  }

  return alerts.sort((a, b) => b.percentDrop - a.percentDrop);
}

export async function getAllPriceAlerts(limit = 5): Promise<PriceAlert[]> {
  const [custom, history] = await Promise.all([
    getCustomRuleAlerts(),
    getPriceAlerts(limit),
  ]);

  const combined: PriceAlert[] = [
    ...custom,
    ...history.map((alert) => ({ ...alert, source: 'history' as const })),
  ];

  return combined.sort((a, b) => b.percentDrop - a.percentDrop).slice(0, limit);
}

export async function checkPriceAlertsAfterReceiptSave(
  items: Array<{ name: string; price: number }>,
  storeName: string
): Promise<PriceAlert[]> {
  const rules = await getPriceAlertRules();
  const enabled = rules.filter((rule) => rule.enabled);
  const triggered: PriceAlert[] = [];

  for (const rule of enabled) {
    for (const item of items) {
      if (!itemMatchesAlertRule(rule, item.name)) continue;
      if (item.price > rule.targetPrice) continue;

      triggered.push({
        itemName: item.name,
        store: storeName,
        oldPrice: rule.targetPrice,
        newPrice: item.price,
        percentDrop:
          rule.targetPrice > 0 ? ((rule.targetPrice - item.price) / rule.targetPrice) * 100 : 0,
        emoji: itemEmoji(item.name),
        source: 'custom',
        ruleId: rule.id,
        targetPrice: rule.targetPrice,
      });
    }
  }

  if (triggered.length > 0) {
    const { notifyPriceAlertMatches } = await import('@/src/services/notificationService');
    await notifyPriceAlertMatches(triggered);
  }

  return triggered;
}

export async function refreshPriceAlertChecks(): Promise<PriceAlert[]> {
  const alerts = await getAllPriceAlerts(10);
  if (alerts.length > 0) {
    const { notifyPriceAlertMatches } = await import('@/src/services/notificationService');
    await notifyPriceAlertMatches(alerts.slice(0, 3));
  }
  return alerts;
}

export type { PriceAlertRule };
