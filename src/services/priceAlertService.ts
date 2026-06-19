import { getCatalogItem } from '@/src/data/commonGroceryItems';
import type { PriceAlertRule } from '@/src/models/types';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import { getPriceAlerts, type PriceAlert } from '@/src/services/analyticsService';
import { getCommunityPricesForItem } from '@/src/services/crowdsourcedPricingService';
import {
  itemMatchesAlertRule,
  resolveCanonicalName,
} from '@/src/services/itemNormalizationService';
import {
  getPriceAlertRules,
  getReceiptItemsWithStore,
  type ReceiptItemWithStore,
} from '@/src/services/storageService';

export type PriceDataSource = 'receipts' | 'community' | 'estimate';

export type CurrentPriceInfo = {
  price: number;
  source: PriceDataSource;
  storeName?: string;
  observedAt?: string;
};

export type RulePriceStatus = 'at_target' | 'above_target' | 'no_data';

export type RuleWithCurrentPrice = PriceAlertRule & {
  currentPrice: CurrentPriceInfo | null;
  status: RulePriceStatus;
};

let receiptItemsCache: ReceiptItemWithStore[] | null = null;

export function invalidatePriceAlertCache(): void {
  receiptItemsCache = null;
}

async function getCachedReceiptItems(): Promise<ReceiptItemWithStore[]> {
  if (receiptItemsCache) return receiptItemsCache;
  receiptItemsCache = await getReceiptItemsWithStore();
  return receiptItemsCache;
}

function resolveAlertEmoji(rule: PriceAlertRule, itemName: string): string {
  return rule.emoji ?? getItemEmoji(rule.canonicalName, itemName);
}

function computeStatus(currentPrice: CurrentPriceInfo | null, targetPrice: number): RulePriceStatus {
  if (!currentPrice) return 'no_data';
  if (currentPrice.price <= targetPrice) return 'at_target';
  return 'above_target';
}

function lookupReceiptPrice(
  rule: PriceAlertRule,
  items: ReceiptItemWithStore[]
): CurrentPriceInfo | null {
  const matching = items.filter((item) => itemMatchesAlertRule(rule, item.name));
  if (matching.length === 0) return null;

  matching.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
  const latest = matching[0];
  return {
    price: latest.price,
    source: 'receipts',
    storeName: latest.storeName,
    observedAt: latest.receiptDate,
  };
}

async function lookupCommunityPrice(rule: PriceAlertRule): Promise<CurrentPriceInfo | null> {
  const searchName = rule.canonicalName ?? rule.itemName;
  const communityPrices = await getCommunityPricesForItem(searchName);
  if (communityPrices.length === 0) return null;

  const sorted = [...communityPrices].sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  const best = sorted[0];
  return {
    price: best.avgPrice,
    source: 'community',
    storeName: best.store,
    observedAt: best.latestDate,
  };
}

function lookupCatalogEstimate(rule: PriceAlertRule): CurrentPriceInfo | null {
  const canonical = rule.canonicalName ?? resolveCanonicalName(rule.itemName);
  if (!canonical) return null;
  const catalog = getCatalogItem(canonical);
  if (catalog?.expectedPrice == null) return null;
  return {
    price: catalog.expectedPrice,
    source: 'estimate',
  };
}

export async function getRuleWithCurrentPrice(
  rule: PriceAlertRule,
  receiptItems?: ReceiptItemWithStore[]
): Promise<RuleWithCurrentPrice> {
  const items = receiptItems ?? (await getCachedReceiptItems());

  const receiptPrice = lookupReceiptPrice(rule, items);
  if (receiptPrice) {
    return { ...rule, currentPrice: receiptPrice, status: computeStatus(receiptPrice, rule.targetPrice) };
  }

  const communityPrice = await lookupCommunityPrice(rule);
  if (communityPrice) {
    return {
      ...rule,
      currentPrice: communityPrice,
      status: computeStatus(communityPrice, rule.targetPrice),
    };
  }

  const estimate = lookupCatalogEstimate(rule);
  return {
    ...rule,
    currentPrice: estimate,
    status: computeStatus(estimate, rule.targetPrice),
  };
}

export async function getAllRulesWithCurrentPrice(): Promise<RuleWithCurrentPrice[]> {
  const rules = await getPriceAlertRules();
  const items = await getCachedReceiptItems();
  return Promise.all(rules.map((rule) => getRuleWithCurrentPrice(rule, items)));
}

export async function getEnabledRulesWithCurrentPrice(): Promise<RuleWithCurrentPrice[]> {
  const rules = await getAllRulesWithCurrentPrice();
  return rules.filter((rule) => rule.enabled);
}

export function formatPriceSourceLabel(source: PriceDataSource): string {
  switch (source) {
    case 'receipts':
      return 'From receipts';
    case 'community':
      return 'Community';
    case 'estimate':
      return 'Est.';
  }
}

export function formatRuleStatusLabel(status: RulePriceStatus): string {
  switch (status) {
    case 'at_target':
      return 'At target';
    case 'above_target':
      return 'Above target';
    case 'no_data':
      return 'No price data yet — scan receipts';
  }
}

export async function getCustomRuleAlerts(): Promise<PriceAlert[]> {
  const rules = await getPriceAlertRules();
  const enabledRules = rules.filter((rule) => rule.enabled);
  if (enabledRules.length === 0) return [];

  const items = await getCachedReceiptItems();
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
      emoji: resolveAlertEmoji(rule, latest.name),
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
  invalidatePriceAlertCache();

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
        emoji: resolveAlertEmoji(rule, item.name),
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
  invalidatePriceAlertCache();
  const alerts = await getAllPriceAlerts(10);
  if (alerts.length > 0) {
    const { notifyPriceAlertMatches } = await import('@/src/services/notificationService');
    await notifyPriceAlertMatches(alerts.slice(0, 3));
  }
  return alerts;
}

export type { PriceAlertRule };
