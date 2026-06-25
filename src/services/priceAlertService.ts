import { getCatalogItem } from '@/src/data/commonGroceryItems';
import type { PriceAlertRule } from '@/src/models/types';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import { canAccessFeature } from '@/src/services/featureGateService';
import { getPriceAlerts, type PriceAlert } from '@/src/services/analyticsService';
import { getCommunityPricesForItem } from '@/src/services/crowdsourcedPricingService';
import {
  itemMatchesAlertRule,
  resolveCanonicalName,
} from '@/src/services/itemNormalizationService';
import {
  getPriceAlertRules,
  getReceiptItemsWithStore,
  savePriceAlertRule,
  type ReceiptItemWithStore,
} from '@/src/services/storageService';
import type { RotatingItemComparison } from '@/src/services/priceComparisonService';
import {
  findDuplicateAlertRule,
  findStorePriceForComparison,
} from '@/src/services/priceAlertTrackUtils';
import { generateId } from '@/src/utils/id';
import { unhideTrackedItem } from '@/src/utils/priceTrackerPreferences';

export type PriceDataSource = 'receipts' | 'community' | 'estimate';

export type CurrentPriceInfo = {
  price: number;
  source: PriceDataSource;
  storeName?: string;
  observedAt?: string;
};

export type StorePriceQuote = {
  storeName: string;
  price: number;
  source: PriceDataSource;
  observedAt?: string;
};

export type RulePriceStatus = 'at_target' | 'above_target' | 'no_data';

export type RuleWithCurrentPrice = PriceAlertRule & {
  currentPrice: CurrentPriceInfo | null;
  storePrices: StorePriceQuote[];
  status: RulePriceStatus;
};

let receiptItemsCache: ReceiptItemWithStore[] | null = null;

export async function persistPriceAlertRule(
  rule: Omit<PriceAlertRule, 'createdAt'> & { createdAt?: string }
): Promise<PriceAlertRule> {
  const saved = await savePriceAlertRule(rule);
  if (saved.enabled) {
    await unhideTrackedItem(saved.canonicalName ?? saved.itemName);
    invalidatePriceAlertCache();
  }
  return saved;
}

export async function trackItemPriceAlert(
  itemName: string,
  targetPrice: number
): Promise<{ created: boolean; rule: PriceAlertRule }> {
  const rules = await getPriceAlertRules();
  const duplicate = findDuplicateAlertRule(rules, itemName, targetPrice);
  if (duplicate) {
    await unhideTrackedItem(duplicate.canonicalName ?? duplicate.itemName);
    return { created: false, rule: duplicate };
  }

  const canonicalName = resolveCanonicalName(itemName);
  const rule = await persistPriceAlertRule({
    id: generateId(),
    itemName,
    canonicalName,
    emoji: getItemEmoji(canonicalName, itemName),
    targetPrice,
    enabled: true,
  });
  return { created: true, rule };
}

export type TrackAtStoreResult = {
  created: number;
  skipped: number;
  trackedItems: Array<{ itemName: string; targetPrice: number }>;
};

export async function trackListItemsAtStore(
  comparisons: RotatingItemComparison[],
  storeName: string
): Promise<TrackAtStoreResult> {
  const rules = await getPriceAlertRules();
  const workingRules = [...rules];
  let created = 0;
  let skipped = 0;
  const trackedItems: Array<{ itemName: string; targetPrice: number }> = [];

  for (const comparison of comparisons) {
    const price = findStorePriceForComparison(comparison, storeName);
    if (price == null) continue;

    const duplicate = findDuplicateAlertRule(workingRules, comparison.itemName, price);
    if (duplicate) {
      skipped += 1;
      continue;
    }

    const canonicalName = resolveCanonicalName(comparison.itemName);
    const rule = await persistPriceAlertRule({
      id: generateId(),
      itemName: comparison.itemName,
      canonicalName,
      emoji: getItemEmoji(canonicalName, comparison.itemName),
      targetPrice: price,
      enabled: true,
    });
    workingRules.push(rule);
    created += 1;
    trackedItems.push({ itemName: comparison.itemName, targetPrice: price });
  }

  return { created, skipped, trackedItems };
}

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
  const storePrices = lookupReceiptStorePrices(rule, items);
  if (storePrices.length === 0) return null;

  const latest = [...storePrices].sort((a, b) =>
    (b.observedAt ?? '').localeCompare(a.observedAt ?? '')
  )[0];
  return {
    price: latest.price,
    source: 'receipts',
    storeName: latest.storeName,
    observedAt: latest.observedAt,
  };
}

export function lookupReceiptStorePrices(
  rule: PriceAlertRule,
  items: ReceiptItemWithStore[]
): StorePriceQuote[] {
  const matching = items.filter((item) => itemMatchesAlertRule(rule, item.name));
  const byStore = new Map<string, ReceiptItemWithStore>();

  for (const item of matching) {
    const storeKey = item.storeName.trim().toLowerCase();
    if (!storeKey) continue;
    const existing = byStore.get(storeKey);
    if (!existing || item.receiptDate.localeCompare(existing.receiptDate) > 0) {
      byStore.set(storeKey, item);
    }
  }

  return [...byStore.values()]
    .map((item) => ({
      storeName: item.storeName,
      price: item.price,
      source: 'receipts' as const,
      observedAt: item.receiptDate,
    }))
    .sort((a, b) => a.price - b.price);
}

async function lookupStorePrices(
  rule: PriceAlertRule,
  items: ReceiptItemWithStore[]
): Promise<StorePriceQuote[]> {
  const receiptPrices = lookupReceiptStorePrices(rule, items);
  const receiptStoreKeys = new Set(receiptPrices.map((quote) => quote.storeName.trim().toLowerCase()));

  const communityPrices = await getCommunityPricesForItem(rule.canonicalName ?? rule.itemName);
  const communityQuotes: StorePriceQuote[] = communityPrices
    .filter((entry) => !receiptStoreKeys.has(entry.store.trim().toLowerCase()))
    .map((entry) => ({
      storeName: entry.store,
      price: entry.avgPrice,
      source: 'community' as const,
      observedAt: entry.latestDate,
    }));

  return [...receiptPrices, ...communityQuotes].sort((a, b) => a.price - b.price);
}

function bestStorePrice(storePrices: StorePriceQuote[]): StorePriceQuote | null {
  if (storePrices.length === 0) return null;
  return storePrices[0];
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
  const storePrices = await lookupStorePrices(rule, items);
  const bestPrice = bestStorePrice(storePrices);

  const receiptPrice = lookupReceiptPrice(rule, items);
  if (receiptPrice) {
    const statusPrice = bestPrice ?? receiptPrice;
    return {
      ...rule,
      currentPrice: receiptPrice,
      storePrices,
      status: computeStatus(statusPrice, rule.targetPrice),
    };
  }

  const communityPrice = await lookupCommunityPrice(rule);
  if (communityPrice) {
    const mergedStorePrices =
      storePrices.length > 0
        ? storePrices
        : [
            {
              storeName: communityPrice.storeName ?? 'Community',
              price: communityPrice.price,
              source: 'community' as const,
              observedAt: communityPrice.observedAt,
            },
          ];
    const statusPrice = bestStorePrice(mergedStorePrices) ?? communityPrice;
    return {
      ...rule,
      currentPrice: communityPrice,
      storePrices: mergedStorePrices,
      status: computeStatus(statusPrice, rule.targetPrice),
    };
  }

  const estimate = lookupCatalogEstimate(rule);
  return {
    ...rule,
    currentPrice: estimate,
    storePrices,
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
  const custom = await getCustomRuleAlerts();
  const history = canAccessFeature('price_drop_alerts') ? await getPriceAlerts(limit) : [];

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
  if (!canAccessFeature('price_drop_alerts')) {
    return getCustomRuleAlerts();
  }
  invalidatePriceAlertCache();
  const alerts = await getAllPriceAlerts(10);
  if (alerts.length > 0) {
    const { notifyPriceAlertMatches } = await import('@/src/services/notificationService');
    await notifyPriceAlertMatches(alerts.slice(0, 3));
  }
  return alerts;
}

export type { PriceAlertRule };
