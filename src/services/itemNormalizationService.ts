import Fuse from 'fuse.js';

import { COMMON_GROCERY_ITEMS, getCatalogItem } from '@/src/data/commonGroceryItems';
import type { PriceAlertRule } from '@/src/models/types';
import { FUZZY_MATCH_THRESHOLD } from '@/src/services/matchingService';

const ALIAS_TO_CANONICAL = new Map<string, string>();

for (const item of COMMON_GROCERY_ITEMS) {
  ALIAS_TO_CANONICAL.set(item.canonicalName.toLowerCase(), item.canonicalName);
  for (const alias of item.aliases) {
    ALIAS_TO_CANONICAL.set(alias.toLowerCase(), item.canonicalName);
  }
}

const catalogFuse = new Fuse(
  COMMON_GROCERY_ITEMS.flatMap((item) => [
    { label: item.canonicalName, canonicalName: item.canonicalName },
    ...item.aliases.map((alias) => ({ label: alias, canonicalName: item.canonicalName })),
  ]),
  {
    keys: ['label'],
    threshold: 1 - FUZZY_MATCH_THRESHOLD,
    includeScore: true,
  }
);

export const SUGGESTED_DISCOUNT_PERCENT = 0.1;

export function resolveCanonicalName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;

  const direct = ALIAS_TO_CANONICAL.get(trimmed.toLowerCase());
  if (direct) return direct;

  const results = catalogFuse.search(trimmed);
  const best = results[0];
  if (best?.score != null && best.score <= 1 - FUZZY_MATCH_THRESHOLD) {
    return best.item.canonicalName;
  }

  return undefined;
}

/** Direct alias lookup only — for user-typed custom items (no fuzzy catalog guessing). */
export function resolveCanonicalNameExact(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  return ALIAS_TO_CANONICAL.get(trimmed.toLowerCase());
}

export function fuzzyMatchItemName(ruleName: string, itemName: string): boolean {
  const fuse = new Fuse([{ name: itemName.trim() }], {
    keys: ['name'],
    threshold: 1 - FUZZY_MATCH_THRESHOLD,
    includeScore: true,
  });
  const results = fuse.search(ruleName.trim());
  return results.length > 0 && results[0].score != null && results[0].score <= 1 - FUZZY_MATCH_THRESHOLD;
}

export function itemMatchesAlertRule(rule: PriceAlertRule, itemName: string): boolean {
  const ruleCanonical = rule.canonicalName ?? resolveCanonicalName(rule.itemName);
  const itemCanonical = resolveCanonicalName(itemName);

  if (ruleCanonical && itemCanonical && ruleCanonical.toLowerCase() === itemCanonical.toLowerCase()) {
    return true;
  }

  if (ruleCanonical && fuzzyMatchItemName(ruleCanonical, itemName)) {
    return true;
  }

  if (itemCanonical && fuzzyMatchItemName(rule.itemName, itemCanonical)) {
    return true;
  }

  return fuzzyMatchItemName(rule.itemName, itemName);
}

export function suggestTargetPrice(basePrice: number, discountPercent = SUGGESTED_DISCOUNT_PERCENT): number {
  const discounted = basePrice * (1 - discountPercent);
  return Math.max(0.01, Math.round(discounted * 100) / 100);
}

export function getMatchExamples(canonicalName?: string, itemName?: string): string[] {
  const name = (canonicalName ?? itemName ?? '').trim();
  if (!name) return [];

  const exact = resolveCanonicalNameExact(name);
  if (!exact) return [];

  const catalog = getCatalogItem(exact);
  if (!catalog) return [];
  return catalog.aliases.slice(0, 3).map((alias) => alias.replace(/\b\w/g, (c) => c.toUpperCase()));
}
