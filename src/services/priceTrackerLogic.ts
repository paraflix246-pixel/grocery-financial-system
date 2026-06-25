import { getItemEmoji } from '@/src/data/commonGroceryItems';

export type ReceiptItemRow = {
  name: string;
  price: number;
  quantity: number;
  storeName: string;
  receiptDate: string;
};

export type TrackedItemRule = {
  id: string;
  itemName: string;
  canonicalName?: string;
  emoji?: string;
};

export type TrackedItemEntry = {
  slug: string;
  name: string;
  emoji: string;
  source: 'alert' | 'receipt' | 'starter';
  alertRuleIds: string[];
  sortOrder?: number;
};

export type ResolveCanonicalName = (name: string) => string | undefined;

export function normalizeTrackedItemKey(
  itemName: string,
  resolveCanonical: ResolveCanonicalName
): string {
  const canonical = resolveCanonical(itemName.trim()) ?? itemName.trim();
  return canonical.toLowerCase();
}

export function isTrackedItemHidden(
  itemName: string,
  hiddenKeys: ReadonlySet<string>,
  resolveCanonical: ResolveCanonicalName
): boolean {
  return hiddenKeys.has(normalizeTrackedItemKey(itemName, resolveCanonical));
}

export function toTrackedItemSlug(name: string): string {
  return encodeURIComponent(name.trim());
}

export function buildTrackedItems(
  rules: TrackedItemRule[],
  receiptItems: ReceiptItemRow[],
  hiddenKeys: ReadonlySet<string>,
  resolveCanonical: ResolveCanonicalName,
  maxItems = 12
): TrackedItemEntry[] {
  const seen = new Set<string>();
  const tracked: TrackedItemEntry[] = [];

  const pushItem = (entry: Omit<TrackedItemEntry, 'slug'> & { slug?: string }) => {
    const key = normalizeTrackedItemKey(entry.name, resolveCanonical);
    if (!key || seen.has(key) || isTrackedItemHidden(entry.name, hiddenKeys, resolveCanonical)) return;
    seen.add(key);
    tracked.push({
      slug: entry.slug ?? toTrackedItemSlug(entry.name),
      name: entry.name,
      emoji: entry.emoji,
      source: entry.source,
      alertRuleIds: entry.alertRuleIds,
    });
  };

  for (const rule of rules) {
    if (tracked.length >= maxItems) break;
    const name = rule.canonicalName ?? rule.itemName;
    pushItem({
      name,
      emoji: rule.emoji ?? getItemEmoji(name, rule.itemName),
      source: 'alert',
      alertRuleIds: [rule.id],
    });
  }

  const sortedReceipt = [...receiptItems].sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
  for (const item of sortedReceipt) {
    if (tracked.length >= maxItems) break;
    const name = resolveCanonical(item.name) ?? item.name;
    const key = normalizeTrackedItemKey(name, resolveCanonical);
    if (seen.has(key)) continue;
    pushItem({
      name,
      emoji: getItemEmoji(name, item.name),
      source: 'receipt',
      alertRuleIds: [],
    });
  }

  return tracked;
}

/** Items from the user's most recent receipt, deduped by canonical name. */
export function buildRecentReceiptTrackedEntries(
  receiptItems: readonly ReceiptItemRow[],
  hiddenKeys: ReadonlySet<string>,
  resolveCanonical: ResolveCanonicalName,
  maxItems = 12
): TrackedItemEntry[] {
  if (receiptItems.length === 0) return [];

  const latestDate = receiptItems.reduce(
    (max, item) => (item.receiptDate > max ? item.receiptDate : max),
    receiptItems[0]!.receiptDate
  );

  const seen = new Set<string>();
  const entries: TrackedItemEntry[] = [];

  for (const item of receiptItems) {
    if (item.receiptDate !== latestDate) continue;
    if (entries.length >= maxItems) break;

    const name = resolveCanonical(item.name) ?? item.name.trim();
    const key = normalizeTrackedItemKey(name, resolveCanonical);
    if (!key || seen.has(key) || isTrackedItemHidden(name, hiddenKeys, resolveCanonical)) continue;

    seen.add(key);
    entries.push({
      slug: toTrackedItemSlug(name),
      name,
      emoji: getItemEmoji(name, item.name),
      source: 'receipt',
      alertRuleIds: [],
      sortOrder: entries.length,
    });
  }

  return entries;
}
