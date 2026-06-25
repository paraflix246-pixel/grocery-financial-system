/**
 * Spatial receipt line reconstruction from OCR word overlays.
 *
 * Instead of parsing a flat text string line-by-line, we use the word bounding
 * boxes returned by OCR.space (isOverlayRequired=true) to:
 *
 *   1. Anchor each line on the rightmost price token.
 *   2. Assign everything to the left of that price as the item name.
 *   3. Detect truncated names (first word starts far to the right of the
 *      typical left margin, meaning the receipt edge was obstructed).
 *   4. Collect repair candidates — items whose name was a detectable fragment —
 *      so a targeted AI repair pass can recover the full name later.
 *
 * This replaces the text-based parseReceiptLines for item extraction.
 * Store name, date, and footer totals are still read from the raw text.
 */

import type { OcrLine, OcrWord } from '@/src/services/ocr/ocrOverlayTypes';
import type { ParsedReceiptDraft } from '@/src/models/types';
import {
  HIDDEN_ITEM_NAME,
  isFooterItemName,
  isFragmentedItemName,
  isHiddenItemName,
  isReadableItemName,
} from '@/src/utils/receiptDraftNormalizer';
import { computeItemsSubtotal } from '@/src/utils/receiptTotals';
import { parseLineEndPrice, roundMoney } from '@/src/utils/priceParser';
import {
  isPlausibleItemPrice,
  looksLikeReceiptHeaderJunk,
} from '@/src/utils/receiptHeaderFilter';

function isPriceOnlyOcrLine(line: string): boolean {
  const price = parseLineEndPrice(line);
  if (price == null || price <= 0) return false;
  const namePart = line
    .replace(/\$?\s*\d+\.\d{2}\s*(?:H|_)?\s*$/i, '')
    .replace(/\$?\s*\d{1,4}\s+\d{2}\s*(?:H|_)?\s*$/i, '')
    .trim();
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

/** Barcode / transaction id lines that must not pair with the next price-only row. */
function looksLikeBarcodeOrHeader(text: string): boolean {
  return looksLikeReceiptHeaderJunk(text);
}

function filterPlausibleLineItems(
  items: ReceiptLineItem[],
  subtotal?: number
): ReceiptLineItem[] {
  const context = { subtotal };
  return items.filter(
    (item) =>
      !looksLikeReceiptHeaderJunk(item.name) &&
      isPlausibleItemPrice(item.price, context)
  );
}

/** US receipts often emit a price line followed by the product name on the next line. */
export function detectPriceBeforeNameFormat(ocrText: string): boolean {
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let pairs = 0;

  for (let index = 0; index < lines.length - 1; index++) {
    const line = lines[index]!;
    const price = parseLineEndPrice(line);
    if (price == null || price <= 0 || price >= 10_000) continue;
    if (!isPriceOnlyOcrLine(line)) continue;

    if (index > 0) {
      const previous = lines[index - 1]!;
      if (
        parseLineEndPrice(previous) == null &&
        looksLikeStandaloneOcrItemName(previous) &&
        !isFooterItemName(previous) &&
        (index < 2 || parseLineEndPrice(lines[index - 2]!) == null)
      ) {
        continue;
      }
    }

    const next = lines[index + 1]!;
    if (parseLineEndPrice(next) != null) continue;
    if (!looksLikeStandaloneOcrItemName(next)) continue;
    if (isFooterItemName(next)) continue;
    pairs++;
  }

  return pairs >= 3;
}

type ReceiptLineItem = ParsedReceiptDraft['items'][0];

/**
 * Prefer text or spatial OCR line items. Spatial layout can mis-pair names when
 * Paddle merges a junk header line with the first price; text parsing handles
 * name-then-price receipts correctly. Break ties with readable count, then
 * whichever item sum is closest to the printed subtotal.
 */
export function pickOcrDraftLineItems(
  textItems: ReceiptLineItem[],
  spatialItems: ReceiptLineItem[],
  subtotal?: number,
  ocrText?: string | null
): ReceiptLineItem[] {
  const filteredText = filterPlausibleLineItems(textItems, subtotal);
  const filteredSpatial = filterPlausibleLineItems(spatialItems, subtotal);

  if (filteredSpatial.length === 0) return filteredText;
  if (filteredText.length === 0) return filteredSpatial;

  if (ocrText?.trim() && detectPriceBeforeNameFormat(ocrText)) {
    if (filteredText.length >= filteredSpatial.length) {
      return filteredText;
    }
  }

  if (subtotal != null && subtotal > 0) {
    const textDelta = Math.abs(computeItemsSubtotal(filteredText) - subtotal);
    const spatialDelta = Math.abs(computeItemsSubtotal(filteredSpatial) - subtotal);
    if (Math.abs(textDelta - spatialDelta) > 0.05) {
      return textDelta < spatialDelta ? filteredText : filteredSpatial;
    }
  }

  const textReadable = filteredText.filter((item) => isReadableItemName(item.name)).length;
  const spatialReadable = filteredSpatial.filter((item) => isReadableItemName(item.name)).length;
  return textReadable >= spatialReadable ? filteredText : filteredSpatial;
}

const PRICE_RE = /^\$?(\d+\.\d{2})$/;
const SPACED_PRICE_RE = /^\$?(\d{1,4})\s+(\d{2})$/;

/** True when a word looks like a price token (e.g. "$12.99" or "12.99"). */
function isPriceWord(word: string): boolean {
  const trimmed = word.trim();
  return PRICE_RE.test(trimmed) || SPACED_PRICE_RE.test(trimmed);
}

function parsePriceWord(word: string): number | null {
  const trimmed = word.trim();
  const strict = trimmed.match(PRICE_RE);
  if (strict) return roundMoney(parseFloat(strict[1]));
  const spaced = trimmed.match(SPACED_PRICE_RE);
  if (spaced) return roundMoney(parseFloat(`${spaced[1]}.${spaced[2]}`));
  return null;
}

/** True when a word is a quantity modifier, not a name token. */
function isQtyWord(word: string): boolean {
  return /^(qty|x|@|\d+x)$/i.test(word.trim());
}

/**
 * For a line's word list, find the rightmost price token and split:
 *   nameWords = everything to the left of the price
 *   price     = numeric value of the price token
 * Returns null when no price token is found.
 */
function extractLineParts(
  words: OcrWord[]
): { price: number; nameWords: OcrWord[] } | null {
  for (let i = words.length - 1; i >= 0; i--) {
    const parsed = parsePriceWord(words[i].text);
    if (parsed == null) continue;
    const price = parsed;
    if (price <= 0 || price >= 10_000) continue;
    return { price, nameWords: words.slice(0, i) };
  }

  // PaddleOCR often returns one box per receipt row ("RIBEYE STEAK PK 44.61").
  const lineText = words
    .map((word) => word.text)
    .join(' ')
    .trim();
  const price = parseLineEndPrice(lineText);
  if (price == null) return null;

  const nameText = lineText
    .replace(/\$?\s*\d+\.\d{2}\s*(?:H|_)?\s*$/i, '')
    .replace(/\$?\s*\d{1,4}\s+\d{2}\s*(?:H|_)?\s*$/i, '')
    .trim();
  const anchor = words[0];
  if (!anchor) return null;

  const nameWords: OcrWord[] = nameText
    ? [{ ...anchor, text: nameText, width: Math.max(anchor.width, nameText.length * 8) }]
    : [];

  return { price, nameWords };
}

/**
 * Compute the typical left margin by taking the median left-edge of the first
 * word on each line. Lines whose first word starts notably further right are
 * likely truncated (obstructed by a thumb, fold, etc.).
 */
function computeLeftMarginThreshold(lines: OcrLine[]): number {
  const lefts = lines
    .filter((l) => l.words.length > 0)
    .map((l) => l.words[0].left);
  if (lefts.length === 0) return 0;

  const sorted = [...lefts].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  return Math.max(median * 2.5, median + 20);
}

/**
 * A fragment item whose name could not be confidently determined, bundled with
 * the raw OCR text and the names of adjacent items for use in a targeted AI
 * repair pass.
 */
export type FragmentRepairCandidate = {
  /** Position of this item in the spatial items array. */
  itemIndex: number;
  /** Raw OCR text exactly as seen (e.g. "OWELS", "GAT*"). */
  rawFragment: string;
  /** Already-correct price — the repair prompt must never change this. */
  price: number;
  /** Up to 2 readable item names immediately above in receipt order. */
  before: string[];
  /** Up to 2 readable item names immediately below in receipt order. */
  after: string[];
  /** Vision model name at this price slot, when available. */
  visionHint?: string;
};

export type SpatialLayoutResult = {
  items: ParsedReceiptDraft['items'];
  /** Fragments the AI repair pass should attempt to recover. */
  repairCandidates: FragmentRepairCandidate[];
};

/**
 * Reconstruct receipt line items from OCR word overlay data.
 * Items whose names look like fragments or come from truncated lines are set to
 * HIDDEN_ITEM_NAME, but their raw text is preserved in repairCandidates so a
 * focused AI pass can attempt to recover the full name.
 */
export function buildLineItemsFromOverlay(lines: OcrLine[]): SpatialLayoutResult {
  const truncationThreshold = computeLeftMarginThreshold(lines);
  const items: ParsedReceiptDraft['items'] = [];
  const rawFragments: Map<number, string> = new Map();
  let pastSubtotal = false;
  let pendingNameLine: string | null = null;
  let pendingPrice: number | null = null;

  for (const line of lines) {
    if (line.words.length === 0) continue;

    const lineText = line.words.map((word) => word.text).join(' ').trim();
    if (/\b(sub\s*total|subtotal)\b/i.test(lineText)) {
      pastSubtotal = true;
    }

    const parts = extractLineParts(line.words);
    if (!parts) {
      if (/^T\s*$/i.test(lineText)) {
        if (pendingNameLine) pendingNameLine = `${pendingNameLine} T`;
        continue;
      }

      if (
        !pastSubtotal &&
        pendingPrice != null &&
        looksLikeStandaloneOcrItemName(lineText) &&
        !isFooterItemName(lineText)
      ) {
        const itemIndex = items.length;
        const rawName = lineText.trim();
        if (!isFragmentedItemName(rawName)) {
          items.push({ name: rawName, price: pendingPrice, quantity: 1 });
        } else {
          items.push({ name: HIDDEN_ITEM_NAME, price: pendingPrice, quantity: 1 });
          rawFragments.set(itemIndex, rawName);
        }
        pendingPrice = null;
        pendingNameLine = null;
        continue;
      }

      if (!pastSubtotal && (lineText.match(/[a-zA-Z]/g) ?? []).length >= 2) {
        if (!isFooterItemName(lineText)) {
          if (pendingNameLine && !/^QTY\s+\d+/i.test(lineText)) {
            pendingNameLine = lineText;
          } else {
            pendingNameLine = pendingNameLine ? `${pendingNameLine} ${lineText}` : lineText;
          }
        }
      }
      continue;
    }

    const { price, nameWords } = parts;
    const itemIndex = items.length;

    if (
      !pastSubtotal &&
      (looksLikeReceiptHeaderJunk(lineText) || !isPlausibleItemPrice(price))
    ) {
      continue;
    }

    if (nameWords.length === 0) {
      if (pastSubtotal) continue;

      const pendingName = pendingNameLine?.trim() ?? '';
      const canPairPendingName =
        pendingName &&
        !isFooterItemName(pendingName) &&
        !isFragmentedItemName(pendingName) &&
        !looksLikeBarcodeOrHeader(pendingName);

      if (canPairPendingName) {
        items.push({ name: pendingName, price, quantity: 1 });
        pendingNameLine = null;
        pendingPrice = null;
        continue;
      }

      if (pendingPrice != null) {
        items.push({ name: HIDDEN_ITEM_NAME, price: pendingPrice, quantity: 1 });
      }
      pendingPrice = price;
      pendingNameLine = null;
      continue;
    }

    pendingNameLine = null;
    pendingPrice = null;

    const firstWordLeft = nameWords[0].left;
    const nameParts = nameWords.filter((w) => !isQtyWord(w.text));
    const rawName = nameParts.map((w) => w.text).join(' ').trim();
    const isTruncated =
      truncationThreshold > 0 &&
      firstWordLeft > truncationThreshold &&
      (rawName.length < 10 || isFragmentedItemName(rawName));

    if (isFooterItemName(rawName)) continue;
    if (looksLikeReceiptHeaderJunk(rawName) || !isPlausibleItemPrice(price)) continue;

    if (isTruncated || !rawName || isFragmentedItemName(rawName)) {
      items.push({ name: HIDDEN_ITEM_NAME, price, quantity: 1 });
      rawFragments.set(itemIndex, rawName);
      continue;
    }

    items.push({ name: rawName, price, quantity: 1 });
  }

  if (pendingPrice != null && !pastSubtotal) {
    items.push({ name: HIDDEN_ITEM_NAME, price: pendingPrice, quantity: 1 });
  }

  // Build repair candidates with neighbor context from the fully-populated
  // items list (so before/after are accurate).
  const repairCandidates: FragmentRepairCandidate[] = [];
  for (const [itemIndex, rawFragment] of rawFragments) {
    const before = items
      .slice(Math.max(0, itemIndex - 2), itemIndex)
      .map((it) => it.name)
      .filter((n) => !isHiddenItemName(n));
    const after = items
      .slice(itemIndex + 1, Math.min(items.length, itemIndex + 3))
      .map((it) => it.name)
      .filter((n) => !isHiddenItemName(n));

    repairCandidates.push({
      itemIndex,
      rawFragment,
      price: items[itemIndex]!.price,
      before,
      after,
    });
  }

  return { items, repairCandidates };
}

/**
 * Build repair candidates from the finalized draft (exact UI rows) enriched with
 * raw OCR fragments matched by price + occurrence order.
 */
export function buildRepairCandidatesFromDraft(
  draft: ParsedReceiptDraft,
  spatialCandidates: FragmentRepairCandidate[],
  visionDraft?: ParsedReceiptDraft | null
): FragmentRepairCandidate[] {
  const fragmentByPriceOrder = new Map<string, string>();
  const spatialPriceCounts = new Map<number, number>();
  for (const candidate of spatialCandidates) {
    const order = spatialPriceCounts.get(candidate.price) ?? 0;
    spatialPriceCounts.set(candidate.price, order + 1);
    fragmentByPriceOrder.set(`${candidate.price.toFixed(2)}:${order}`, candidate.rawFragment);
  }

  const visionNamesByPriceOrder = new Map<string, string>();
  if (visionDraft?.items.length) {
    const visionCounts = new Map<number, number>();
    for (const item of visionDraft.items) {
      if (!isReadableItemName(item.name)) continue;
      const order = visionCounts.get(item.price) ?? 0;
      visionCounts.set(item.price, order + 1);
      visionNamesByPriceOrder.set(`${item.price.toFixed(2)}:${order}`, item.name.trim());
    }
  }

  const candidates: FragmentRepairCandidate[] = [];
  const draftPriceCounts = new Map<number, number>();

  draft.items.forEach((item, itemIndex) => {
    if (!isHiddenItemName(item.name)) return;

    const order = draftPriceCounts.get(item.price) ?? 0;
    draftPriceCounts.set(item.price, order + 1);
    const priceKey = `${item.price.toFixed(2)}:${order}`;

    candidates.push({
      itemIndex,
      rawFragment: fragmentByPriceOrder.get(priceKey) ?? '',
      price: item.price,
      visionHint: visionNamesByPriceOrder.get(priceKey),
      before: draft.items
        .slice(Math.max(0, itemIndex - 2), itemIndex)
        .map((row) => row.name)
        .filter((name) => !isHiddenItemName(name)),
      after: draft.items
        .slice(itemIndex + 1, Math.min(draft.items.length, itemIndex + 3))
        .map((row) => row.name)
        .filter((name) => !isHiddenItemName(name)),
    });
  });

  return candidates;
}

/** True when a repaired name is supported by visible OCR text (not a pure guess). */
export function repairSupportedByFragment(fragment: string, repairedName: string): boolean {
  const fragmentText = fragment.trim();
  if (fragmentText.length < 2) return false;

  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const f = normalize(fragmentText);
  const r = normalize(repairedName);
  if (!f || !r) return false;
  if (r.includes(f) || f.includes(r)) return true;

  const firstWord = f.split(' ')[0] ?? '';
  if (firstWord.length >= 3 && r.includes(firstWord.slice(0, 3))) return true;

  return false;
}

/** Apply GPT repair results to hidden rows in the finalized draft. */
export function applyFragmentRepairsToDraft(
  draft: ParsedReceiptDraft,
  candidates: FragmentRepairCandidate[],
  repairsByCandidateIndex: Map<number, string>
): ParsedReceiptDraft {
  const candidateIndexByItem = new Map<number, number>();
  candidates.forEach((candidate, candidateIndex) => {
    candidateIndexByItem.set(candidate.itemIndex, candidateIndex);
  });

  const items = draft.items.map((item, itemIndex) => {
    const candidateIndex = candidateIndexByItem.get(itemIndex);
    if (candidateIndex == null) return item;

    const candidate = candidates[candidateIndex]!;
    const repairedName = repairsByCandidateIndex.get(candidateIndex);
    if (
      !repairedName ||
      !isReadableItemName(repairedName) ||
      !repairSupportedByFragment(candidate.rawFragment, repairedName)
    ) {
      return item;
    }

    return { ...item, name: repairedName.trim() };
  });

  return { ...draft, items };
}
