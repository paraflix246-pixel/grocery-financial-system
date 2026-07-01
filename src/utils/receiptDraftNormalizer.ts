import type { ParsedReceiptDraft } from '@/src/models/types';
import { normalizeStoreLocation } from '@/src/utils/storeLocationParser';
import { computeItemsSubtotal, computeReceiptTotals } from '@/src/utils/receiptTotals';
import { guessDateFromText, normalizeReceiptDate, resolveReceiptDate, todayISO } from '@/src/utils/dateParser';
import { extractItemPricesFromOcrText, trimPricesToSubtotal } from '@/src/utils/ocrPriceSequence';
import {
  filterPlausibleItemPrices,
  isPlausibleItemPrice,
  looksLikeReceiptHeaderJunk,
  looksLikeStoreHeaderLine,
  looksLikeSurveyHeaderJunk,
} from '@/src/utils/receiptHeaderFilter';
import {
  applyStoreLocationToDraft,
  mergeStoreLocation,
  parseStoreLocationFromOcrText,
} from '@/src/utils/storeLocationParser';
import { roundMoney, parseLineEndPrice, parseTaxLineAmount } from '@/src/utils/priceParser';
import { parsePrintedTaxRateFromText } from '@/src/utils/taxRateUtils';
import { normalizeUnitLabel } from '@/src/utils/unitPriceParser';

export const HIDDEN_ITEM_NAME = '(name hidden)';

export function isHiddenItemName(name: string): boolean {
  return name.trim().toLowerCase() === HIDDEN_ITEM_NAME.toLowerCase();
}

/**
 * OCR noise characters that indicate an artifact rather than a real character.
 * A name containing any of these is treated as unreadable.
 */
const OCR_ARTIFACT_RE = /[*!?#@~\\^|<>]/;

/**
 * Patterns that indicate the OCR captured the middle or end of a word,
 * not the start — e.g. "OWELS" (TOWELS), "ISH SOAP" (DISH SOAP),
 * "ET PAPER" (TOILET PAPER), "ASH BAGS" (TRASH BAGS).
 *
 * A name whose first "word" matches one of these is a fragment.
 */
const FRAGMENT_FIRST_WORD_RE = /^(?:owel|ish|ump|ell|ound|tion|ing|ed\b|ock\b|ack\b|ish\b|et\b)/i;

/** Standalone tokens that are partial product names, not real grocery labels. */
const FRAGMENT_TOKEN_RE =
  /^(?:gat(?:e|es)?|gas|cerea|bash|bish|ash|sunnes?|owels|ish|best\s+paper)$/i;

/** Multi-word OCR suffix fragments (vision often expands these into pseudo-names). */
const FRAGMENT_PHRASE_RE =
  /^(?:bash\s+bags|bish\s+soap|ash\s+bags|ish\s+soap|best\s+paper)$/i;

/** First-word prefixes from truncated product names (GATORADE, TRASH BAGS, DISH SOAP, etc.). */
const FRAGMENT_FIRST_WORD_PREFIX_RE =
  /^(?:gat(?:e|es)?|gas|bash|bish|ash|sunnes?|cerea|owel)/i;

export function isFragmentedItemName(name: string): boolean {
  const t = name.trim();
  if (!t || t.length < 3) return true;
  if (/^\d+$/.test(t)) return true;
  if (OCR_ARTIFACT_RE.test(t)) return true;

  const normalized = normalizeItemName(t);
  const lower = normalized.toLowerCase();
  if (FRAGMENT_PHRASE_RE.test(lower)) return true;
  if (FRAGMENT_TOKEN_RE.test(lower)) return true;

  const firstWord = (normalized.split(/\s+/)[0] ?? '').replace(/^[^a-zA-Z]+/, '');
  if (FRAGMENT_FIRST_WORD_RE.test(firstWord)) return true;
  if (FRAGMENT_FIRST_WORD_PREFIX_RE.test(firstWord)) return true;

  if (!normalized.includes(' ') && normalized.length <= 4 && /^[A-Za-z]+$/.test(normalized)) {
    if (/^(?:gat|gas|ash|ish|bash|bish|cere)$/i.test(normalized)) return true;
  }

  return false;
}

export function isReadableItemName(name: string): boolean {
  const normalized = normalizeItemName(name);
  if (/^\.+$/.test(normalized.replace(/\s/g, ''))) return false;
  if (guessDateFromText(normalized)) return false;
  if (looksLikeSurveyHeaderJunk(normalized)) return false;
  return (
    !isHiddenItemName(normalized) &&
    !isFragmentedItemName(normalized) &&
    !isFooterItemName(normalized) &&
    normalized.length >= 3 &&
    !/^item\b|^unknown/i.test(normalized)
  );
}

import {
  classifyReceiptLineKind,
  isPaymentLineName,
  isTotalsFooterLabel,
  looksLikePromoFooterJunk,
} from '@/src/utils/receiptMerchandiseFilter';

export {
  classifyReceiptLineKind,
  isPaymentLineName,
  isTotalsFooterLabel,
  looksLikePromoFooterJunk,
} from '@/src/utils/receiptMerchandiseFilter';

export function isMerchandiseLineItem(item: ReceiptLineItem): boolean {
  return (
    !isHiddenItemName(item.name) &&
    !isFooterItemName(item.name) &&
    !isPaymentLineName(item.name) &&
    !looksLikePromoFooterJunk(item.name)
  );
}

/** Receipt footer / payment labels that must never appear as product line items. */
export function isFooterItemName(name: string): boolean {
  const normalized = normalizeItemName(name).toLowerCase();
  if (isTotalsFooterLabel(normalized)) return true;
  if (isPaymentLineName(normalized)) return true;
  if (looksLikePromoFooterJunk(normalized)) return true;
  return false;
}
type AiReceiptPayload = {
  storeName?: unknown;
  storeNumber?: unknown;
  date?: unknown;
  items?: unknown;
  subtotal?: unknown;
  tax?: unknown;
  printedTaxRate?: unknown;
  total?: unknown;
  storeAddress?: unknown;
  storeCity?: unknown;
  storeRegion?: unknown;
  storePostalCode?: unknown;
  storeCountry?: unknown;
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
  if (isHiddenItemName(name)) return HIDDEN_ITEM_NAME;
  return name
    .replace(/\s+H\s*$/i, '')
    .replace(/\s+_\s*$/g, '')
    .replace(/\.+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeStoreName(storeName: string, items: ReceiptLineItem[]): string {
  const trimmed = storeName.trim();
  if (!trimmed || /^unknown store$/i.test(trimmed)) return trimmed || 'Unknown Store';

  const storeKey = normalizeNameKey(trimmed);
  if (items.some((item) => normalizeNameKey(item.name) === storeKey)) {
    return 'Unknown Store';
  }

  if (/\b(pk|lb|oz|gal|ct|each|count|steak|milk|bread)\b/i.test(trimmed)) {
    return 'Unknown Store';
  }

  return trimmed;
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
  const lineKind = item.lineKind ?? classifyReceiptLineKind(item.name);
  return {
    ...item,
    name: normalizeItemName(item.name),
    price: roundMoney(item.price),
    quantity: item.quantity > 0 ? item.quantity : 1,
    ...(lineKind !== 'merchandise' ? { lineKind } : {}),
  };
}

/** Tag every row with merchandise | fee | other. */
export function tagLineItemsWithKind(items: ReceiptLineItem[]): ReceiptLineItem[] {
  return preserveReceiptLineItems(items).map((item) => ({
    ...item,
    lineKind: item.lineKind ?? classifyReceiptLineKind(item.name),
  }));
}

function isStrippedTotalsRow(item: ReceiptLineItem, draft: ParsedReceiptDraft): boolean {
  return isTotalsFooterLabel(item.name) || isFooterLineItemPrice(item.price, draft);
}

/** Remove only subtotal/tax/total footer rows — keep fees and promo OCR lines. */
export function stripFooterLineItems(draft: ParsedReceiptDraft): ParsedReceiptDraft {
  const items = preserveReceiptLineItems(
    draft.items.filter((item) => !isStrippedTotalsRow(item, draft))
  );
  return { ...draft, items };
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

function subtotalDelta(items: ParsedReceiptDraft['items'], subtotal: number): number {
  return Math.abs(computeItemsSubtotal(items) - subtotal);
}

function pickItemName(aiItem: ReceiptLineItem, ocrItem: ReceiptLineItem): string {
  const aiName = normalizeItemName(aiItem.name);
  const ocrName = normalizeItemName(ocrItem.name);
  const aiHidden = isHiddenItemName(aiName);
  const ocrHidden = isHiddenItemName(ocrName);

  if (!aiHidden && aiName.length >= 3 && (ocrHidden || aiName.length >= ocrName.length + 2)) {
    return aiName;
  }
  if (!ocrHidden && ocrName.length >= 3) {
    return ocrName;
  }
  if (aiHidden || ocrHidden) {
    return HIDDEN_ITEM_NAME;
  }

  if (aiName.length >= ocrName.length + 2 && !/^item\b|^unknown/i.test(aiName)) {
    return aiName;
  }
  if (ocrName.length >= 2) return ocrName;
  return aiName;
}

/** Keep AI names but assign OCR prices in receipt order when subtotals prove misalignment. */
export function alignDraftPricesToOcrOrder(
  draft: ParsedReceiptDraft,
  ocrDraft: ParsedReceiptDraft
): ParsedReceiptDraft {
  const aiItems = preserveReceiptLineItems(draft.items);
  const ocrItems = preserveReceiptLineItems(ocrDraft.items);
  if (ocrItems.length === 0) return draft;

  const maxLen = Math.max(aiItems.length, ocrItems.length);
  const items: ReceiptLineItem[] = [];

  for (let index = 0; index < maxLen; index++) {
    const aiItem = aiItems[index];
    const ocrItem = ocrItems[index];

    if (aiItem && ocrItem) {
      items.push({
        name: pickItemName(aiItem, ocrItem),
        price: ocrItem.price,
        quantity: ocrItem.quantity > 1 ? ocrItem.quantity : aiItem.quantity,
      });
      continue;
    }

    if (ocrItem) {
      items.push(ocrItem);
      continue;
    }

    if (aiItem) {
      items.push(aiItem);
    }
  }

  return (
    normalizeParsedReceiptDraft(
      {
        storeName: draft.storeName || ocrDraft.storeName,
        date: draft.date || ocrDraft.date,
        items,
        subtotal: draft.subtotal ?? ocrDraft.subtotal,
        tax: draft.tax ?? ocrDraft.tax,
        total: draft.total ?? ocrDraft.total,
      },
      draft
    ) ?? draft
  );
}

/** Prefer OCR row order/prices when AI rows don't add up to the printed subtotal. */
export function reconcileDraftWithOcrStructure(
  draft: ParsedReceiptDraft,
  ocrDraft?: ParsedReceiptDraft | null,
  ocrText?: string | null
): ParsedReceiptDraft {
  let result = draft;

  if (ocrText?.trim()) {
    result = {
      ...result,
      date: resolveReceiptDate(result.date, ocrText, result.storeName),
    };
  }

  if (!result.subtotal || result.subtotal <= 0) {
    return ocrDraft ? appendMissingReceiptItems(result, ocrDraft) : result;
  }

  const itemsMismatch = subtotalDelta(result.items, result.subtotal) > 0.15;

  if (ocrText?.trim() && itemsMismatch) {
    result = alignDraftToOcrPriceSequence(result, ocrText);
  } else if (
    ocrDraft?.items.length &&
    itemsMismatch &&
    subtotalDelta(ocrDraft.items, result.subtotal) + 0.25 <
      subtotalDelta(result.items, result.subtotal)
  ) {
    result = alignDraftPricesToOcrOrder(result, ocrDraft);
  }

  return result;
}

/** Assign OCR item prices by row index; add (name hidden) only for extra pre-subtotal prices. */
export function alignDraftToOcrPriceSequence(
  draft: ParsedReceiptDraft,
  ocrText: string
): ParsedReceiptDraft {
  const target = draft.subtotal;
  if (!target || target <= 0) return draft;

  const prices = extractItemPricesFromOcrText(ocrText, {
    subtotal: draft.subtotal,
    tax: draft.tax,
    total: draft.total,
  });
  if (prices.length === 0) return draft;

  const priceSum = roundMoney(prices.reduce((sum, price) => sum + price, 0));
  const itemsSum = computeItemsSubtotal(draft.items);
  const sequenceMatchesSubtotal = Math.abs(priceSum - target) <= 0.15;
  const itemsMismatch = Math.abs(itemsSum - target) > 0.15;

  if (!sequenceMatchesSubtotal || !itemsMismatch) {
    return draft;
  }

  const aiItems = preserveReceiptLineItems(draft.items);
  const items: ReceiptLineItem[] = prices.map((price, index) => {
    const aiItem = aiItems[index];
    if (aiItem) {
      return {
        name: aiItem.name,
        price,
        quantity: aiItem.quantity,
      };
    }
    return { name: HIDDEN_ITEM_NAME, price, quantity: 1 };
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
    ) ?? draft
  );
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

function isConsistentFooterTriple(
  subtotal?: number,
  tax?: number,
  total?: number
): boolean {
  return (
    subtotal != null &&
    subtotal > 0 &&
    tax != null &&
    tax >= 0 &&
    total != null &&
    total > 0 &&
    Math.abs(subtotal + tax - total) <= 0.05
  );
}

/** Canadian receipts often print SUBTOTAL = TOTAL with HST shown as included breakdown. */
export function isCanadianTaxInclusiveFooter(
  subtotal?: number,
  tax?: number,
  total?: number
): boolean {
  return (
    subtotal != null &&
    subtotal > 0 &&
    total != null &&
    total > 0 &&
    tax != null &&
    tax > 0 &&
    Math.abs(subtotal - total) <= 0.01
  );
}

/** True when OCR text includes a tax footer label (TAX, HST, GST, VAT, etc.). */
export function receiptTextHasTaxLine(text: string): boolean {
  return text
    .split(/\r?\n/)
    .some((line) => {
      const lower = line.toLowerCase();
      return /\b(tax|hst|gst|vat|sales tax)\b/i.test(lower) && !/\btotal\b/i.test(lower);
    });
}

function parseFooterTotalsFromOcrText(
  ocrText: string
): Partial<Pick<ParsedReceiptDraft, 'subtotal' | 'tax' | 'total'>> {
  const result: Partial<Pick<ParsedReceiptDraft, 'subtotal' | 'tax' | 'total'>> = {};
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const isStandalonePriceLine = (line: string): boolean => {
    if (!line) return false;
    if ((line.match(/[a-zA-Z]/g) ?? []).length > 0) return false;
    return parseLineEndPrice(line) != null;
  };

  const footerPriceForIndex = (index: number, label: 'subtotal' | 'tax' | 'total'): number | undefined => {
    const current = parseLineEndPrice(lines[index] ?? '');
    if (current != null) return current;

    const prev = lines[index - 1];
    const next = lines[index + 1];
    const prevPrice =
      prev && isStandalonePriceLine(prev) ? parseLineEndPrice(prev) ?? undefined : undefined;
    const nextPrice =
      next && isStandalonePriceLine(next) ? parseLineEndPrice(next) ?? undefined : undefined;

    if (prevPrice != null && nextPrice != null) {
      if (label === 'subtotal') return prevPrice;
      if (label === 'tax') return prevPrice > nextPrice ? nextPrice : prevPrice;
      return nextPrice > prevPrice ? nextPrice : prevPrice;
    }

    return nextPrice ?? prevPrice;
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    const lower = line.toLowerCase();

    if (/\b(sub\s*total|subtotal|merchandise)\b/i.test(lower)) {
      const price = footerPriceForIndex(index, 'subtotal');
      if (price != null) result.subtotal = price;
      continue;
    }

    if (/\b(tax|hst|gst|vat|sales tax)\b/i.test(lower) && !/\btotal\b/i.test(lower)) {
      const inlineTax = parseTaxLineAmount(line);
      const price =
        inlineTax != null && (!/\bon\s+\$/i.test(line) || inlineTax >= 20)
          ? inlineTax
          : footerPriceForIndex(index, 'tax');
      if (price != null && (price >= 20 || result.tax == null)) result.tax = price;
      continue;
    }

    if (/\b(total|amount due|balance due|grand total|total due)\b/i.test(lower)) {
      const price = footerPriceForIndex(index, 'total');
      if (price != null) result.total = price;
    }
  }

  return result;
}

/** Fill tax from subtotal/total gap only when the receipt printed a tax line. */
function inferMissingTaxFromFooter(
  parsed: Partial<Pick<ParsedReceiptDraft, 'subtotal' | 'tax' | 'total'>>,
  options?: { taxLineDetected?: boolean }
): Partial<Pick<ParsedReceiptDraft, 'subtotal' | 'tax' | 'total'>> {
  const result = { ...parsed };
  if (
    options?.taxLineDetected &&
    result.subtotal != null &&
    result.subtotal > 0 &&
    result.total != null &&
    result.total > result.subtotal + 0.01 &&
    (result.tax == null || result.tax === 0)
  ) {
    result.tax = roundMoney(result.total - result.subtotal);
  }
  return result;
}

/** Detect subtotal/tax/total smuggled into items[] as consecutive prices. */
export function inferFooterTripleFromItems(
  items: ReceiptLineItem[]
): Partial<Pick<ParsedReceiptDraft, 'subtotal' | 'tax' | 'total'>> | null {
  const prices = items.map((item) => item.price);

  for (let index = prices.length - 3; index >= 0; index--) {
    const subtotal = prices[index];
    const tax = prices[index + 1];
    const total = prices[index + 2];

    if (isConsistentFooterTriple(subtotal, tax, total) && total >= subtotal + tax - 0.05) {
      return { subtotal, tax, total };
    }
  }

  return null;
}

/** Subtotal + total smuggled into items without a tax row — recover bounds only, not tax. */
export function inferFooterBoundsFromItems(
  items: ReceiptLineItem[]
): Partial<Pick<ParsedReceiptDraft, 'subtotal' | 'total'>> | null {
  const prices = items.map((item) => item.price);
  if (prices.length < 3) return null;

  const subtotal = prices[prices.length - 2]!;
  const total = prices[prices.length - 1]!;
  const priorPrices = prices.slice(0, -2);
  const maxPrior = priorPrices.length > 0 ? Math.max(...priorPrices) : 0;

  if (subtotal > maxPrior + 0.01 && total > subtotal + 0.01) {
    return { subtotal, total };
  }

  return null;
}

function minItemPrice(items: ReceiptLineItem[]): number {
  if (items.length === 0) return 0;
  return Math.min(...items.map((item) => roundMoney(item.price)));
}

/** AI sometimes sets subtotal/total to the tax amount (e.g. $1.18) instead of merchandise totals. */
function draftTotalsLookLikeTaxOnly(
  draft: ParsedReceiptDraft,
  subtotal?: number,
  total?: number,
  tax?: number
): boolean {
  const productItems = draft.items.filter(
    (item) => !isFooterItemName(item.name) && !isHiddenItemName(item.name)
  );
  if (productItems.length === 0) return false;

  const minPrice = minItemPrice(productItems);
  const productSum = computeItemsSubtotal(productItems);
  const candidate = subtotal ?? total ?? 0;
  if (candidate <= 0) return false;

  if (candidate < minPrice - 0.01) return true;
  if (isCanadianTaxInclusiveFooter(subtotal, tax, total)) {
    return false;
  }
  if (
    subtotal != null &&
    total != null &&
    Math.abs(subtotal - total) <= 0.01 &&
    candidate < productSum - 0.5
  ) {
    return true;
  }

  return false;
}

/** Reject tax-only footer noise (e.g. subtotal=total=$1.18) while real lines cost more. */
function isPlausibleMerchandiseTriple(
  draft: ParsedReceiptDraft,
  subtotal?: number,
  tax?: number,
  total?: number
): boolean {
  if (isCanadianTaxInclusiveFooter(subtotal, tax, total)) {
    return !draftTotalsLookLikeTaxOnly(draft, subtotal, total, tax);
  }
  if (!isConsistentFooterTriple(subtotal, tax, total)) return false;
  if (draftTotalsLookLikeTaxOnly(draft, subtotal, total, tax)) return false;
  return true;
}

/** Resolve printed footer totals from OCR, draft fields, or polluted item rows. */
export function resolvePrintedTotals(
  draft: ParsedReceiptDraft,
  ocrText?: string | null,
  ocrDraft?: ParsedReceiptDraft | null
): { subtotal: number; tax: number; total: number } {
  const taxLineDetected = ocrText?.trim() ? receiptTextHasTaxLine(ocrText) : false;
  const inferOpts = { taxLineDetected };
  const fromOcrText = inferMissingTaxFromFooter(
    ocrText?.trim() ? parseFooterTotalsFromOcrText(ocrText) : {},
    inferOpts
  );
  const fromItems = inferFooterTripleFromItems(draft.items);
  const fromItemBounds = inferFooterBoundsFromItems(draft.items);

  // A consistent subtotal + tax = total triple is the strongest signal. Prefer it
  // from OCR header text, then from any triple printed inside the item rows, then
  // from the parsed OCR draft / AI draft fields.
  const tripleCandidates: Array<Partial<Pick<ParsedReceiptDraft, 'subtotal' | 'tax' | 'total'>>> = [
    fromOcrText,
    fromItems ?? {},
    inferMissingTaxFromFooter(
      {
        subtotal: ocrDraft?.subtotal,
        tax: ocrDraft?.tax,
        total: ocrDraft?.total,
      },
      inferOpts
    ),
    inferMissingTaxFromFooter(
      {
        subtotal: draft.subtotal,
        tax: draft.tax,
        total: draft.total,
      },
      inferOpts
    ),
  ];

  for (const candidate of tripleCandidates) {
    if (isPlausibleMerchandiseTriple(draft, candidate.subtotal, candidate.tax, candidate.total)) {
      return {
        subtotal: candidate.subtotal!,
        tax: candidate.tax!,
        total: candidate.total!,
      };
    }
  }

  // No consistent triple — fall back to the best individual fields we have.
  let subtotal =
    fromOcrText.subtotal ??
    fromItems?.subtotal ??
    fromItemBounds?.subtotal ??
    ocrDraft?.subtotal ??
    draft.subtotal;
  let tax = fromOcrText.tax ?? fromItems?.tax ?? ocrDraft?.tax ?? draft.tax;
  let total =
    fromOcrText.total ?? fromItems?.total ?? fromItemBounds?.total ?? ocrDraft?.total ?? draft.total;

  if (draftTotalsLookLikeTaxOnly(draft, subtotal, total, tax)) {
    const recoverySources = [
      fromItems,
      fromOcrText,
      inferMissingTaxFromFooter(
        {
          subtotal: ocrDraft?.subtotal,
          tax: ocrDraft?.tax,
          total: ocrDraft?.total,
        },
        inferOpts
      ),
    ];
    for (const recovered of recoverySources) {
      if (isPlausibleMerchandiseTriple(draft, recovered?.subtotal, recovered?.tax, recovered?.total)) {
        return {
          subtotal: recovered!.subtotal!,
          tax: recovered!.tax!,
          total: recovered!.total!,
        };
      }
    }
    subtotal = fromOcrText.subtotal ?? ocrDraft?.subtotal ?? fromItems?.subtotal ?? subtotal;
    tax = fromOcrText.tax ?? ocrDraft?.tax ?? fromItems?.tax ?? tax;
    total = fromOcrText.total ?? ocrDraft?.total ?? fromItems?.total ?? total;
  }

  if (total != null && total > 0 && tax != null && (subtotal == null || subtotal <= 0)) {
    subtotal = roundMoney(total - tax);
  }

  return {
    subtotal: subtotal ?? 0,
    tax: tax ?? 0,
    total: total ?? 0,
  };
}

function isFooterLineItemPrice(price: number, draft: ParsedReceiptDraft): boolean {
  if (draft.subtotal != null && Math.abs(price - draft.subtotal) <= 0.01) return true;
  if (draft.tax != null && Math.abs(price - draft.tax) <= 0.01) return true;
  if (draft.total != null && Math.abs(price - draft.total) <= 0.01) return true;
  return false;
}

/** Remove subtotal/tax/total footer amounts mistakenly listed as line items. */
export function stripTotalsFooterLineItems(draft: ParsedReceiptDraft): ParsedReceiptDraft {
  return stripFooterLineItems(draft);
}

/** Drop OCR header mash-ups (TC#/store#/date + phantom prices like 885.06). */
export function stripHeaderJunkLineItems(
  draft: ParsedReceiptDraft,
  subtotal?: number
): ParsedReceiptDraft {
  const context = { subtotal: subtotal ?? draft.subtotal };
  const items = preserveReceiptLineItems(
    draft.items.filter(
      (item) =>
        !looksLikeReceiptHeaderJunk(item.name) &&
        !looksLikeReceiptHeaderJunk(`${item.name} ${item.price.toFixed(2)}`) &&
        isPlausibleItemPrice(item.price, context)
    )
  );
  return { ...draft, items };
}

/** Keep merchandise rows only until their sum reaches the printed subtotal; fees/other are kept. */
export function trimItemsToSubtotalSum(
  items: ReceiptLineItem[],
  subtotal: number
): ReceiptLineItem[] {
  if (subtotal <= 0 || items.length === 0) return items;

  const minPrice = minItemPrice(items.filter((item) => (item.lineKind ?? classifyReceiptLineKind(item.name)) === 'merchandise'));
  if (subtotal < minPrice - 0.01) return items;

  const result: ReceiptLineItem[] = [];
  let sum = 0;

  for (const item of items) {
    const kind = item.lineKind ?? classifyReceiptLineKind(item.name);
    if (kind !== 'merchandise') {
      result.push(item);
      continue;
    }

    const lineTotal = roundMoney(item.price * item.quantity);
    if (sum + lineTotal > subtotal + 0.05) break;
    result.push(item);
    sum = roundMoney(sum + lineTotal);
    if (Math.abs(sum - subtotal) <= 0.05) break;
  }

  const keptMerch = result.filter((item) => (item.lineKind ?? classifyReceiptLineKind(item.name)) === 'merchandise');
  if (keptMerch.length === 0 && items.length > 0) return items;

  return result;
}

function priceListSubtotalDelta(prices: number[], subtotal: number): number {
  const sum = roundMoney(prices.reduce((total, price) => total + price, 0));
  return Math.abs(sum - subtotal);
}

/** Pick OCR draft prices, raw OCR sequence, or vision draft — closest sum to subtotal. */
export function buildAuthoritativePriceList(
  ocrDraft: ParsedReceiptDraft | null | undefined,
  ocrText: string | null | undefined,
  subtotal: number,
  known: { tax?: number; total?: number },
  primaryItems: ReceiptLineItem[] = []
): number[] {
  if (subtotal <= 0) return [];

  const knownTotals = { subtotal, tax: known.tax, total: known.total };
  const filterFooterPrices = (prices: number[]) =>
    prices.filter(
      (price) =>
        !isFooterLineItemPrice(price, {
          subtotal,
          tax: known.tax,
          total: known.total,
        } as ParsedReceiptDraft)
    );

  const canadianHst = isCanadianTaxInclusiveFooter(subtotal, known.tax, known.total);
  const maybeTrimPrices = (prices: number[]) =>
    canadianHst ? prices : trimPricesToSubtotal(prices, subtotal);

  const ocrDraftPrices = maybeTrimPrices(
    filterFooterPrices(
      filterPlausibleItemPrices(
        preserveReceiptLineItems(ocrDraft?.items ?? [])
          .filter(isMerchandiseLineItem)
          .map((item) => item.price),
        { subtotal }
      )
    )
  );

  const ocrTextPrices = ocrText?.trim()
    ? extractItemPricesFromOcrText(ocrText, knownTotals)
    : [];

  const primaryPrices = maybeTrimPrices(
    filterFooterPrices(
      filterPlausibleItemPrices(
        preserveReceiptLineItems(primaryItems)
          .filter(isMerchandiseLineItem)
          .map((item) => item.price),
        { subtotal }
      )
    )
  );

  const candidates = [
    { prices: ocrDraftPrices, source: 'ocrDraft' as const },
    { prices: ocrTextPrices, source: 'ocrText' as const },
    { prices: primaryPrices, source: 'primary' as const },
  ].filter((entry) => entry.prices.length > 0);

  if (candidates.length === 0) return [];

  if (canadianHst) {
    const ocrCandidates = candidates.filter((entry) => entry.source !== 'primary');
    if (ocrCandidates.length > 0) {
      return ocrCandidates.reduce((best, candidate) => {
        const candidateDelta = priceListSubtotalDelta(candidate.prices, subtotal);
        const bestDelta = priceListSubtotalDelta(best.prices, subtotal);
        if (candidateDelta < bestDelta - 0.01) return candidate;
        if (Math.abs(candidateDelta - bestDelta) <= 0.01 && candidate.prices.length > best.prices.length) {
          return candidate;
        }
        return best;
      }).prices;
    }
  }

  let best = candidates[0]!;
  let bestDelta = priceListSubtotalDelta(best.prices, subtotal);

  for (const candidate of candidates.slice(1)) {
    const delta = priceListSubtotalDelta(candidate.prices, subtotal);
    if (delta < bestDelta - 0.01) {
      best = candidate;
      bestDelta = delta;
    } else if (Math.abs(delta - bestDelta) <= 0.01 && candidate.prices.length > best.prices.length) {
      // Prefer more line items when equally close (vision recovered prices OCR missed).
      best = candidate;
    }
  }

  return best.prices;
}

function shouldPreserveDraftRows(
  items: ReceiptLineItem[],
  authoritativePrices: number[],
  subtotal: number
): boolean {
  if (subtotal <= 0 || authoritativePrices.length === 0) return false;
  if (items.length !== authoritativePrices.length) return false;
  if (items.some((item) => looksLikeSurveyHeaderJunk(item.name))) return false;
  if (!items.some((item) => isReadableItemName(item.name))) return false;

  const itemSum = computeItemsSubtotal(items);
  return Math.abs(itemSum - subtotal) <= 0.05;
}

function pickReadableName(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizeItemName(candidate);
    if (isReadableItemName(normalized)) {
      return normalized;
    }
  }

  return HIDDEN_ITEM_NAME;
}

function buildNameQueuesByPriceOrder(items: ReceiptLineItem[]): Map<string, string[]> {
  const queues = new Map<string, string[]>();
  const counts = new Map<number, number>();
  for (const item of items) {
    if (!isReadableItemName(item.name)) continue;
    const price = roundMoney(item.price);
    const order = counts.get(price) ?? 0;
    counts.set(price, order + 1);
    const key = `${price.toFixed(2)}:${order}`;
    const queue = queues.get(key) ?? [];
    queue.push(normalizeItemName(item.name));
    queues.set(key, queue);
  }
  return queues;
}

function looksLikeBarcodeOrHeader(text: string): boolean {
  return looksLikeReceiptHeaderJunk(text);
}

function stripTrailingPriceFromOcrLine(line: string): string {
  return line
    .replace(/\$?\s*\d+\.\d{2}\s*(?:H|_)?\s*$/i, '')
    .replace(/\$?\s*\d{1,4}\s+\d{2}\s*(?:H|_)?\s*$/i, '')
    .trim();
}

function isPriceOnlyOcrLine(line: string): boolean {
  const price = parseLineEndPrice(line);
  if (price == null || price <= 0) return false;
  const namePart = stripTrailingPriceFromOcrLine(line);
  const alphaChars = (namePart.match(/[a-zA-Z]/g) ?? []).length;
  if (alphaChars < 2) return true;
  if (/^\.+$/.test(namePart.replace(/\s/g, ''))) return true;
  return false;
}

function looksLikeStandaloneOcrItemName(line: string): boolean {
  if (line.length < 2) return false;
  if (parseLineEndPrice(line) != null) return false;
  if (/\b(tax|hst|gst|vat|total|amount due|balance due)\b/i.test(line)) return false;
  return (line.match(/[a-zA-Z]/g) ?? []).length >= 2;
}

function enqueueTextLineName(
  queues: Map<string, string[]>,
  counts: Map<number, number>,
  price: number,
  name: string
): void {
  const rounded = roundMoney(price);
  const order = counts.get(rounded) ?? 0;
  counts.set(rounded, order + 1);
  const key = `${rounded.toFixed(2)}:${order}`;
  const queue = queues.get(key) ?? [];
  const normalized = normalizeItemName(name);
  if (!isReadableItemName(normalized)) return;
  queue.push(normalized);
  queues.set(key, queue);
}

/** Readable product names parsed from flat OCR text lines (Paddle rawText). */
export function buildTextLineNameQueues(ocrText: string): Map<string, string[]> {
  const queues = new Map<string, string[]>();
  const counts = new Map<number, number>();
  let pendingName: string | null = null;
  let pendingPrice: number | null = null;
  let paymentBlock = false;

  for (const line of ocrText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (/\b(sub\s*total|subtotal|merchandise)\b/i.test(lower)) break;
    if (looksLikeReceiptHeaderJunk(trimmed)) continue;
    if (looksLikeSurveyHeaderJunk(trimmed)) {
      pendingName = null;
      pendingPrice = null;
      continue;
    }
    if (guessDateFromText(trimmed)) continue;

    if (isPaymentLineName(trimmed)) {
      if (pendingName) {
        const pendingNormalized = normalizeItemName(pendingName);
        if (isReadableItemName(pendingNormalized)) {
          // Orphan product name — price may come from AI draft during alignment.
          pendingName = null;
        }
      }
      paymentBlock = true;
      pendingName = null;
      pendingPrice = null;
      continue;
    }

    if (paymentBlock) {
      if (/^QTY\s+\d+/i.test(trimmed)) continue;
      if (isPriceOnlyOcrLine(trimmed)) {
        paymentBlock = false;
        continue;
      }
      paymentBlock = false;
    }

    // US Walmart: price line then name line.
    if (pendingPrice != null && looksLikeStandaloneOcrItemName(trimmed)) {
      if (!isPaymentLineName(trimmed) && !looksLikePromoFooterJunk(trimmed)) {
        enqueueTextLineName(queues, counts, pendingPrice, trimmed);
      }
      pendingPrice = null;
      pendingName = null;
      continue;
    }

    // Canadian / split-line: name line then price-only row.
    if (pendingName && isPriceOnlyOcrLine(trimmed)) {
      const deferredPrice = parseLineEndPrice(trimmed);
      if (deferredPrice != null && deferredPrice > 0) {
        const pendingIsHeader =
          looksLikeBarcodeOrHeader(pendingName) ||
          guessDateFromText(pendingName) != null ||
          /^STORE\s*#/i.test(pendingName) ||
          looksLikeStoreHeaderLine(pendingName);
        const pendingNameNormalized = normalizeItemName(pendingName);
        if (
          !pendingIsHeader &&
          isReadableItemName(pendingNameNormalized) &&
          !isPaymentLineName(pendingNameNormalized) &&
          !looksLikePromoFooterJunk(pendingNameNormalized)
        ) {
          enqueueTextLineName(queues, counts, deferredPrice, pendingNameNormalized);
          pendingName = null;
          pendingPrice = null;
          continue;
        }
        pendingPrice = deferredPrice;
        pendingName = null;
        continue;
      }
    }

    const price = parseLineEndPrice(trimmed);
    if (price == null || price <= 0) {
      if (/^T\s*$/i.test(trimmed)) {
        if (pendingName) pendingName = `${pendingName} T`;
        continue;
      }
      if (
        !/\b(tax|hst|gst|vat|total|amount due|balance due)\b/i.test(lower) &&
        looksLikeStandaloneOcrItemName(trimmed) &&
        guessDateFromText(trimmed) == null &&
        !/^STORE\s*#/i.test(trimmed) &&
        !looksLikeStoreHeaderLine(trimmed) &&
        !isPaymentLineName(trimmed) &&
        !looksLikePromoFooterJunk(trimmed) &&
        trimmed.length >= 3
      ) {
        if (pendingName && !/^QTY\s+\d+/i.test(trimmed)) {
          pendingName = trimmed;
        } else {
          pendingName = pendingName ? `${pendingName} ${trimmed}` : trimmed;
        }
      }
      continue;
    }

    const rounded = roundMoney(price);

    if (isPriceOnlyOcrLine(trimmed)) {
      pendingPrice = rounded;
      pendingName = null;
      continue;
    }

    let nameText = trimmed
      .replace(/\$?\s*\d+\.\d{2}\s*(?:H|_)?\s*$/i, '')
      .replace(/\$?\s*\d{1,4}\s+\d{2}\s*(?:H|_)?\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if ((!nameText || !isReadableItemName(nameText)) && pendingName) {
      nameText = normalizeItemName(pendingName);
    }
    pendingName = null;
    pendingPrice = null;

    if (!nameText || !isReadableItemName(nameText)) continue;
    if (isPaymentLineName(nameText) || looksLikePromoFooterJunk(nameText)) continue;

    enqueueTextLineName(queues, counts, rounded, nameText);
  }

  return queues;
}

function countOcrTextLineNames(ocrText: string): number {
  const queues = buildTextLineNameQueues(ocrText);
  let count = 0;
  for (const queue of queues.values()) {
    count += queue.length;
  }
  return count;
}

/** US receipts often print price then name — OCR text pairs are more reliable than vision. */
export function shouldPreferOcrTextLineNames(ocrText: string | null | undefined): boolean {
  if (!ocrText?.trim()) return false;
  return countOcrTextLineNames(ocrText) >= 3;
}

function takeNameForPriceOrder(
  queues: Map<string, string[]>,
  price: number,
  order: number
): string | undefined {
  const queue = queues.get(`${roundMoney(price).toFixed(2)}:${order}`);
  if (!queue?.length) return undefined;
  return queue.shift();
}

function nameAtIndexIfPriceMatches(
  items: ReceiptLineItem[],
  index: number,
  price: number
): string | undefined {
  const item = items[index];
  if (!item || roundMoney(item.price) !== roundMoney(price)) return undefined;
  const normalized = normalizeItemName(item.name);
  return isReadableItemName(normalized) ? normalized : undefined;
}

/** Price slots where OCR captured partial/garbage text — block vision guesses on those lines only. */
export function buildOcrUnreadablePriceSlots(items: ReceiptLineItem[]): Set<string> {
  const counts = new Map<number, number>();
  const unreadable = new Set<string>();
  for (const item of items) {
    const price = roundMoney(item.price);
    const order = counts.get(price) ?? 0;
    counts.set(price, order + 1);
    const normalized = normalizeItemName(item.name);
    if (isHiddenItemName(normalized)) continue;
    if (isFragmentedItemName(normalized) || isFooterItemName(normalized)) {
      unreadable.add(`${price.toFixed(2)}:${order}`);
    }
  }
  return unreadable;
}

/** Put back OpenAI names when DeepSeek audit replaced them with (name hidden). */
export function restoreReadableNamesFromPrimary(
  audited: ParsedReceiptDraft,
  primary: ParsedReceiptDraft,
  ocrUnreadableSlots?: Set<string>
): ParsedReceiptDraft {
  const priceOrder = new Map<number, number>();
  const items = audited.items.map((item, index) => {
    if (isReadableItemName(item.name)) return item;

    const price = roundMoney(item.price);
    const order = priceOrder.get(price) ?? 0;
    priceOrder.set(price, order + 1);

    if (ocrUnreadableSlots?.has(`${price.toFixed(2)}:${order}`)) {
      return item;
    }

    const primaryAtIndex = primary.items[index];
    if (
      primaryAtIndex &&
      roundMoney(primaryAtIndex.price) === price &&
      isReadableItemName(primaryAtIndex.name)
    ) {
      return { ...item, name: normalizeItemName(primaryAtIndex.name) };
    }

    return item;
  });

  return { ...audited, items: preserveReceiptLineItems(items) };
}

/** Assign OCR prices by row index; names matched by price + occurrence, not row index alone. */
export function alignNamesToPrices(
  aiItems: ReceiptLineItem[],
  ocrItems: ReceiptLineItem[],
  prices: number[],
  extraNameSources: ReceiptLineItem[] = [],
  ocrText?: string | null
): ReceiptLineItem[] {
  const ocrQueues = buildNameQueuesByPriceOrder(ocrItems);
  const textQueues = ocrText?.trim() ? buildTextLineNameQueues(ocrText) : new Map<string, string[]>();
  const aiQueues = buildNameQueuesByPriceOrder(aiItems);
  const extraQueues = buildNameQueuesByPriceOrder(extraNameSources);
  const ocrUnreadableSlots = buildOcrUnreadablePriceSlots(ocrItems);
  const priceOccurrence = new Map<number, number>();

  return prices.map((price, index) => {
    const rounded = roundMoney(price);
    const order = priceOccurrence.get(rounded) ?? 0;
    priceOccurrence.set(rounded, order + 1);
    const slotKey = `${rounded.toFixed(2)}:${order}`;
    const ocrOnly = ocrUnreadableSlots.has(slotKey);

    return {
      name: pickReadableName(
        takeNameForPriceOrder(textQueues, rounded, order),
        takeNameForPriceOrder(ocrQueues, rounded, order),
        ocrOnly ? undefined : takeNameForPriceOrder(aiQueues, rounded, order),
        ocrOnly ? undefined : takeNameForPriceOrder(extraQueues, rounded, order),
        ocrOnly ? undefined : nameAtIndexIfPriceMatches(aiItems, index, rounded),
        nameAtIndexIfPriceMatches(ocrItems, index, rounded)
      ),
      price: rounded,
      quantity:
        aiItems[index]?.quantity && aiItems[index].quantity > 0
          ? aiItems[index].quantity
          : ocrItems[index]?.quantity && ocrItems[index].quantity > 0
            ? ocrItems[index].quantity
            : 1,
    };
  });
}

function shouldSkipSubtotalTrim(
  items: ReceiptLineItem[],
  subtotal: number,
  tax?: number,
  total?: number,
  ocrDraft?: ParsedReceiptDraft | null
): boolean {
  if (!isCanadianTaxInclusiveFooter(subtotal, tax, total)) return false;
  const source =
    ocrDraft?.items?.length && ocrDraft.items.length > 0
      ? preserveReceiptLineItems(ocrDraft.items)
      : items;
  const merchandise = source.filter((item) => isMerchandiseLineItem(item));
  const sum = computeItemsSubtotal(merchandise);
  if (sum > subtotal + 0.15) return false;
  const readable = merchandise.filter((item) => isReadableItemName(item.name)).length;
  return readable >= Math.min(merchandise.length, 8);
}

/** Prefer the longer OCR price sequence — flat text often has rows spatial layout drops. */
function resolveOcrPriceSequence(
  ocrItems: ReceiptLineItem[],
  ocrText: string | null | undefined,
  known: { subtotal: number; tax?: number; total?: number }
): number[] {
  const context = { subtotal: known.subtotal };
  const plausibleItems = ocrItems.filter(
    (item) => isPlausibleItemPrice(item.price, context) && isMerchandiseLineItem(item)
  );
  const draftPrices = filterPlausibleItemPrices(
    plausibleItems.map((item) => item.price),
    context
  );
  const textPrices = ocrText?.trim()
    ? extractItemPricesFromOcrText(ocrText, known)
    : [];
  const sequence = textPrices.length > draftPrices.length ? textPrices : draftPrices;
  return filterPlausibleItemPrices(sequence, context);
}

function parseStoreNumberFromOcrText(ocrText?: string | null): string | undefined {
  if (!ocrText?.trim()) return undefined;
  const match = ocrText.match(/\bstore\s*#?\s*(\d{3,6})\b/i);
  return match?.[1];
}

/** Restore fee/other rows from vision extraction when flat OCR text missed them. */
function isFeeOrOtherLine(item: ReceiptLineItem): boolean {
  const kind = item.lineKind ?? classifyReceiptLineKind(item.name);
  return kind === 'fee' || kind === 'other';
}

function classifiedLineKey(item: ReceiptLineItem): string {
  const kind = item.lineKind ?? classifyReceiptLineKind(item.name);
  if (kind === 'fee') {
    return `fee|${roundMoney(item.price).toFixed(2)}`;
  }
  return lineKey(item);
}

export function buildReceiptLineSource(
  ocrDraft: ParsedReceiptDraft | null | undefined,
  ocrText: string | null | undefined,
  primaryItems: ReceiptLineItem[]
): ReceiptLineItem[] {
  const fromOcr = ocrDraft?.items?.length
    ? preserveReceiptLineItems(ocrDraft.items)
    : ocrText?.trim()
      ? linesFromOcrText(ocrText)
      : [];

  if (fromOcr.length === 0) {
    return preserveReceiptLineItems(primaryItems);
  }

  const merged = [...fromOcr];
  const seen = new Set(merged.map((item) => classifiedLineKey(item)));

  for (const item of preserveReceiptLineItems(primaryItems)) {
    if (!isFeeOrOtherLine(item)) continue;
    const key = classifiedLineKey(item);
    if (seen.has(key)) continue;
    merged.push({
      ...item,
      lineKind: item.lineKind ?? classifyReceiptLineKind(item.name),
    });
    seen.add(key);
  }

  return merged;
}

/** Restore fee/other rows in receipt order after merchandise alignment. */
export function reconcileAllReceiptLines(
  alignedItems: ReceiptLineItem[],
  sourceItems: ReceiptLineItem[],
  draft: ParsedReceiptDraft
): ReceiptLineItem[] {
  const merchandise = tagLineItemsWithKind(alignedItems).filter(
    (item) => (item.lineKind ?? 'merchandise') === 'merchandise'
  );
  const source = preserveReceiptLineItems(sourceItems).filter(
    (item) => !isStrippedTotalsRow(item, draft) && !looksLikeSurveyHeaderJunk(item.name)
  );

  const supplementary = source.filter((item) => {
    const kind = item.lineKind ?? classifyReceiptLineKind(item.name);
    return kind === 'fee' || kind === 'other';
  });

  if (supplementary.length === 0) {
    return tagLineItemsWithKind(alignedItems);
  }

  const result: ReceiptLineItem[] = [];
  const supplementQueue = [...supplementary];
  let merchIdx = 0;

  for (const sourceItem of source) {
    const kind = sourceItem.lineKind ?? classifyReceiptLineKind(sourceItem.name);
    if (kind === 'fee' || kind === 'other') {
      const next = supplementQueue.shift();
      if (next) result.push({ ...next, lineKind: kind });
      continue;
    }
    if (merchIdx < merchandise.length) {
      result.push(merchandise[merchIdx]!);
      merchIdx++;
    }
  }

  while (merchIdx < merchandise.length) {
    result.push(merchandise[merchIdx]!);
    merchIdx++;
  }

  for (const extra of supplementQueue) {
    result.push({
      ...extra,
      lineKind: extra.lineKind ?? classifyReceiptLineKind(extra.name),
    });
  }

  return tagLineItemsWithKind(result);
}

function linesFromOcrText(ocrText: string): ParsedReceiptDraft['items'] {
  // Lazy require avoids a circular import with receiptParser.
  const { parseReceiptText } = require('@/src/services/receiptParser') as typeof import('@/src/services/receiptParser');
  return parseReceiptText(ocrText).items;
}

/** Authoritative post-processing — strips footer rows, aligns OCR prices, fixes date. */
export function finalizeReceiptDraft(
  draft: ParsedReceiptDraft,
  ocrText?: string | null,
  ocrDraft?: ParsedReceiptDraft | null
): ParsedReceiptDraft {
  const printed = resolvePrintedTotals(draft, ocrText, ocrDraft);
  const nameSources = preserveReceiptLineItems(draft.items);
  let result: ParsedReceiptDraft = {
    ...draft,
    subtotal: printed.subtotal > 0 ? printed.subtotal : draft.subtotal,
    tax: printed.tax > 0 || draft.tax != null ? printed.tax : draft.tax,
    total: printed.total > 0 ? printed.total : draft.total,
  };

  result = stripFooterLineItems(result);
  result = stripHeaderJunkLineItems(result, printed.subtotal);

  const canadianHst = isCanadianTaxInclusiveFooter(
    result.subtotal ?? 0,
    result.tax,
    result.total
  );
  const skipSubtotalTrim = shouldSkipSubtotalTrim(
    result.items,
    result.subtotal ?? 0,
    result.tax,
    result.total,
    ocrDraft
  );

  if (result.subtotal && result.subtotal > 0 && !skipSubtotalTrim) {
    result = {
      ...result,
      items: trimItemsToSubtotalSum(result.items, result.subtotal),
    };
  }

  const subtotal = result.subtotal ?? 0;
  const ocrItems = stripHeaderJunkLineItems(
    { ...result, items: preserveReceiptLineItems(ocrDraft?.items ?? []) },
    subtotal
  ).items;
  const footerKnown = { subtotal, tax: result.tax, total: result.total };
  const ocrPriceSequence = resolveOcrPriceSequence(ocrItems, ocrText, footerKnown);
  const preferOcrTextNames = shouldPreferOcrTextLineNames(ocrText);
  const shouldAlignToOcr =
    (canadianHst || preferOcrTextNames) &&
    ocrPriceSequence.length > 0 &&
    ocrPriceSequence.length >= result.items.length;
  const shouldAlignToPrices =
    subtotal > 0 &&
    (ocrText?.trim() || ocrItems.length > 0) &&
    (!skipSubtotalTrim || shouldAlignToOcr);

  if (shouldAlignToPrices) {
    const prices = shouldAlignToOcr
      ? ocrPriceSequence
      : buildAuthoritativePriceList(
          ocrDraft,
          ocrText,
          subtotal,
          {
            tax: result.tax,
            total: result.total,
          },
          nameSources
        );

    if (
      prices.length > 0 &&
      (shouldAlignToOcr ||
        preferOcrTextNames ||
        !shouldPreserveDraftRows(result.items, prices, subtotal))
    ) {
      result = {
        ...result,
        items: alignNamesToPrices(
          preserveReceiptLineItems(result.items),
          ocrItems,
          prices,
          nameSources,
          ocrText
        ),
      };
    }
  }

  result = stripFooterLineItems(result);
  if (result.subtotal && result.subtotal > 0 && !skipSubtotalTrim) {
    result = {
      ...result,
      items: trimItemsToSubtotalSum(result.items, result.subtotal),
    };
  }

  if (ocrText?.trim()) {
    result = {
      ...result,
      date: resolveReceiptDate(result.date, ocrText, result.storeName),
    };
  }

  if (printed.subtotal > 0 || printed.total > 0) {
    result = {
      ...result,
      subtotal: printed.subtotal > 0 ? printed.subtotal : result.subtotal,
      tax: printed.tax > 0 || result.tax != null ? printed.tax : result.tax,
      total: printed.total > 0 ? printed.total : result.total,
    };
  }

  const ocrLocation = parseStoreLocationFromOcrText(ocrText ?? '');
  result = applyStoreLocationToDraft(result, mergeStoreLocation(result, ocrLocation));

  const lineSource = buildReceiptLineSource(ocrDraft, ocrText, nameSources);
  result = {
    ...result,
    storeNumber: result.storeNumber ?? parseStoreNumberFromOcrText(ocrText),
    items: reconcileAllReceiptLines(result.items, lineSource, result),
  };

  const printedTaxRate =
    draft.printedTaxRate ??
    (ocrText?.trim() ? parsePrintedTaxRateFromText(ocrText) : null) ??
    undefined;

  return (
    normalizeParsedReceiptDraft(
      {
        storeName: result.storeName,
        date: result.date,
        storeNumber: result.storeNumber,
        items: result.items,
        subtotal: result.subtotal,
        tax: result.tax,
        total: result.total,
        printedTaxRate,
        storeAddress: result.storeAddress,
        storeCity: result.storeCity,
        storeRegion: result.storeRegion,
        storePostalCode: result.storePostalCode,
        storeCountry: result.storeCountry,
      },
      result
    ) ?? { ...result, printedTaxRate }
  );
}

export function normalizeParsedReceiptDraft(
  payload: AiReceiptPayload,
  fallback?: ParsedReceiptDraft
): ParsedReceiptDraft | null {
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = preserveReceiptLineItems(
    rawItems.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const record = entry as Record<string, unknown>;
      const name = asString(record.name);
      const price = asNumber(record.price);
      if (!name || price == null || price <= 0) return [];
      const quantity = asNumber(record.quantity) ?? 1;
      const unitPrice = asNumber(record.unitPrice ?? record.unit_price);
      const unit = normalizeUnitLabel(asString(record.unit) ?? undefined);
      const normalizedName = normalizeItemName(name);
      const lineKind = classifyReceiptLineKind(normalizedName);
      return [
        {
          name: isFragmentedItemName(normalizedName) ? HIDDEN_ITEM_NAME : normalizedName,
          price: roundMoney(price),
          quantity: quantity > 0 ? quantity : 1,
          ...(lineKind !== 'merchandise' && !isFragmentedItemName(normalizedName)
            ? { lineKind }
            : {}),
          ...(unitPrice != null && unitPrice > 0 ? { unitPrice: roundMoney(unitPrice) } : {}),
          ...(unit ? { unit } : {}),
        },
      ];
    })
  );

  if (items.length === 0 && !fallback?.items.length) {
    return null;
  }

  const storeName = sanitizeStoreName(
    asString(payload.storeName) ?? fallback?.storeName ?? 'Unknown Store',
    items.length > 0 ? items : (fallback?.items ?? [])
  );
  const storeNumber = asString(payload.storeNumber) ?? fallback?.storeNumber;
  const dateRaw = asString(payload.date) ?? fallback?.date ?? todayISO();
  const date = normalizeReceiptDate(dateRaw, fallback?.date);

  const subtotal = asNumber(payload.subtotal) ?? fallback?.subtotal;
  const tax = asNumber(payload.tax) ?? fallback?.tax;
  const printedTaxRate = asNumber(payload.printedTaxRate) ?? fallback?.printedTaxRate;
  const total = asNumber(payload.total) ?? fallback?.total ?? 0;

  const totals = computeReceiptTotals({
    items: items.length > 0 ? items : (fallback?.items ?? []),
    subtotal,
    tax,
    total,
  });

  const location = normalizeStoreLocation({
    storeAddress: asString(payload.storeAddress) || fallback?.storeAddress,
    storeCity: asString(payload.storeCity) || fallback?.storeCity,
    storeRegion: asString(payload.storeRegion) || fallback?.storeRegion,
    storePostalCode: asString(payload.storePostalCode) || fallback?.storePostalCode,
    storeCountry: asString(payload.storeCountry) || fallback?.storeCountry,
  });

  return {
    storeName,
    date,
    storeNumber,
    subtotal: totals.subtotal,
    tax: totals.tax,
    printedTaxRate,
    total: totals.total,
    ...location,
    items:
      items.length > 0
        ? preserveReceiptLineItems(items)
        : preserveReceiptLineItems(fallback?.items ?? []),
  };
}

/** @deprecated Use preserveReceiptLineItems — duplicates are kept intentionally. */
export const dedupeReceiptItems = preserveReceiptLineItems;
