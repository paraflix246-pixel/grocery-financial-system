import type { ParsedReceiptDraft } from '@/src/models/types';
import { computeReceiptTotals } from '@/src/utils/receiptTotals';
import { guessDateFromText, todayISO } from '@/src/utils/dateParser';
import { roundMoney, parseLineEndPrice } from '@/src/utils/priceParser';

type AiReceiptPayload = {
  storeName?: unknown;
  date?: unknown;
  items?: unknown;
  subtotal?: unknown;
  tax?: unknown;
  total?: unknown;
};

type ReceiptLineItem = ParsedReceiptDraft['items'][0];

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return roundMoney(value);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const match = cleaned.match(/^(\d+)(?:\.(\d{1,2}))?$/);
    if (!match) {
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) ? roundMoney(parsed) : undefined;
    }
    const cents = match[2] ? match[2].padEnd(2, '0').slice(0, 2) : '00';
    return roundMoney(parseFloat(`${match[1]}.${cents}`));
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeItemName(name: string): string {
  return name
    .replace(/\s+H\s*$/i, '')
    .replace(/\s+_\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNameKey(name: string): string {
  return normalizeItemName(name)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lineKey(item: ReceiptLineItem): string {
  return `${normalizeNameKey(item.name)}|${roundMoney(item.price).toFixed(2)}`;
}

function normalizeLineItem(item: ReceiptLineItem): ReceiptLineItem {
  return {
    ...item,
    name: normalizeItemName(item.name),
    price: roundMoney(item.price),
    quantity: item.quantity > 0 ? item.quantity : 1,
  };
}

/** Keep every receipt row — repeated products stay as separate items. */
export function preserveReceiptLineItems(
  items: ParsedReceiptDraft['items']
): ParsedReceiptDraft['items'] {
  return items.map(normalizeLineItem).filter((item) => item.name.length > 0);
}

export function cleanReceiptItemNames(
  items: ParsedReceiptDraft['items']
): ParsedReceiptDraft['items'] {
  return preserveReceiptLineItems(items);
}

function countLineKeys(items: ReceiptLineItem[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = lineKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Merge OCR rows in — keeps duplicate rows when the receipt repeats an item. */
export function mergeReceiptDrafts(
  primary: ParsedReceiptDraft,
  secondary?: ParsedReceiptDraft | null
): ParsedReceiptDraft {
  if (!secondary?.items.length) {
    return primary;
  }

  const mergedItems = preserveReceiptLineItems(primary.items);
  const mergedCounts = countLineKeys(mergedItems);
  const secondaryCounts = countLineKeys(secondary.items);

  for (const candidate of preserveReceiptLineItems(secondary.items)) {
    const key = lineKey(candidate);
    const have = mergedCounts.get(key) ?? 0;
    const target = secondaryCounts.get(key) ?? 0;

    if (have < target) {
      mergedItems.push(candidate);
      mergedCounts.set(key, have + 1);
      continue;
    }

    if (!mergedCounts.has(key)) {
      mergedItems.push(candidate);
      mergedCounts.set(key, 1);
    }
  }

  return (
    normalizeParsedReceiptDraft(
      {
        storeName: primary.storeName,
        date: primary.date,
        items: mergedItems,
        subtotal: primary.subtotal,
        tax: primary.tax,
        total: primary.total,
      },
      primary
    ) ?? primary
  );
}

function receiptItemsMatch(a: ReceiptLineItem, b: ReceiptLineItem): boolean {
  if (Math.abs(roundMoney(a.price) - roundMoney(b.price)) > 0.001) return false;
  if (lineKey(a) === lineKey(b)) return true;

  const keyA = normalizeNameKey(a.name);
  const keyB = normalizeNameKey(b.name);
  if (keyA.includes(keyB) || keyB.includes(keyA)) return true;

  const tokensA = keyA.split(' ').filter((token) => token.length >= 3);
  if (tokensA.length === 0) return false;

  const hits = tokensA.filter((token) => keyB.includes(token)).length;
  return hits / tokensA.length >= 0.5;
}

/** Append reference rows that are not already represented in the draft (keeps duplicate rows). */
export function appendMissingReceiptItems(
  draft: ParsedReceiptDraft,
  reference?: ParsedReceiptDraft | null
): ParsedReceiptDraft {
  if (!reference?.items.length) return draft;

  const items = [...preserveReceiptLineItems(draft.items)];
  const usedIndexes = new Set<number>();

  for (const refItem of preserveReceiptLineItems(reference.items)) {
    let matched = false;

    for (let index = 0; index < items.length; index++) {
      if (usedIndexes.has(index)) continue;
      if (receiptItemsMatch(items[index], refItem)) {
        usedIndexes.add(index);
        matched = true;
        break;
      }
    }

    if (!matched) {
      items.push(refItem);
    }
  }

  return (
    normalizeParsedReceiptDraft(
      {
        storeName: draft.storeName,
        date: draft.date,
        items,
        subtotal: draft.subtotal,
        tax: draft.tax,
        total: draft.total,
      },
      draft
    ) ?? draft
  );
}

/** Union item lists from every source — prefer primary metadata, never drop priced rows. */
export function supplementMissingReceiptItems(
  primary: ParsedReceiptDraft,
  ...sources: Array<ParsedReceiptDraft | null | undefined>
): ParsedReceiptDraft {
  let result = primary;
  for (const source of sources) {
    if (!source?.items.length) continue;
    result = mergeReceiptDrafts(result, source);
    result = appendMissingReceiptItems(result, source);
  }
  return result;
}

function nameMatchScore(itemName: string, line: string): number {
  const tokens = normalizeNameKey(itemName)
    .split(' ')
    .filter((token) => token.length >= 3);
  if (tokens.length === 0) return 0;

  const lineKeyText = normalizeNameKey(line);
  const itemKey = tokens.join(' ');
  if (lineKeyText.includes(itemKey)) return 1;

  const hits = tokens.filter((token) => lineKeyText.includes(token)).length;
  const score = hits / tokens.length;

  // Avoid matching broad shared words like "wheat" or "instant" to the wrong row.
  return score === 1 ? 1 : 0;
}

/** Fix item prices using OCR lines — matches duplicate rows to separate OCR lines in order. */
export function reconcileItemPricesFromOcrText(
  draft: ParsedReceiptDraft,
  ocrText: string
): ParsedReceiptDraft {
  const lines = ocrText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return draft;

  const usedLineIndexes = new Set<number>();

  const items = draft.items.map((item) => {
    let bestIndex = -1;
    let bestScore = 0;

    for (let index = 0; index < lines.length; index++) {
      if (usedLineIndexes.has(index)) continue;
      const line = lines[index];
      const score = nameMatchScore(item.name, line);
      if (score > bestScore && score === 1 && /\d+\.\d{2}/.test(line)) {
        bestScore = score;
        bestIndex = index;
      }
    }

    if (bestIndex < 0) return item;

    usedLineIndexes.add(bestIndex);
    const linePrice = parseLineEndPrice(lines[bestIndex]);
    if (linePrice == null || Math.abs(linePrice - item.price) <= 0.001) {
      return item;
    }

    return { ...item, price: linePrice };
  });

  return (
    normalizeParsedReceiptDraft(
      {
        storeName: draft.storeName,
        date: draft.date,
        items,
        subtotal: draft.subtotal,
        tax: draft.tax,
        total: draft.total,
      },
      draft
    ) ?? { ...draft, items }
  );
}

export function normalizeParsedReceiptDraft(
  payload: AiReceiptPayload,
  fallback?: ParsedReceiptDraft
): ParsedReceiptDraft | null {
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = preserveReceiptLineItems(
    rawItems
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const record = entry as Record<string, unknown>;
        const name = asString(record.name);
        const price = asNumber(record.price);
        if (!name || price == null || price <= 0) return null;
        const quantity = asNumber(record.quantity) ?? 1;
        return {
          name: normalizeItemName(name),
          price: roundMoney(price),
          quantity: quantity > 0 ? quantity : 1,
        };
      })
      .filter((item): item is ReceiptLineItem => item != null)
  );

  if (items.length === 0 && !fallback?.items.length) {
    return null;
  }

  const storeName =
    asString(payload.storeName) ?? fallback?.storeName ?? 'Unknown Store';
  const dateRaw = asString(payload.date) ?? fallback?.date ?? todayISO();
  const date = guessDateFromText(dateRaw) ?? dateRaw;

  const subtotal = asNumber(payload.subtotal) ?? fallback?.subtotal;
  const tax = asNumber(payload.tax) ?? fallback?.tax;
  const total = asNumber(payload.total) ?? fallback?.total ?? 0;

  const totals = computeReceiptTotals({
    items: items.length > 0 ? items : (fallback?.items ?? []),
    subtotal,
    tax,
    total,
  });

  return {
    storeName,
    date,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    items:
      items.length > 0
        ? preserveReceiptLineItems(items)
        : preserveReceiptLineItems(fallback?.items ?? []),
  };
}

/** @deprecated Use preserveReceiptLineItems — duplicates are kept intentionally. */
export const dedupeReceiptItems = preserveReceiptLineItems;
