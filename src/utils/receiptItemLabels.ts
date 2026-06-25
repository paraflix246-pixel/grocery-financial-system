import { isHiddenItemName, isCanadianTaxInclusiveFooter } from '@/src/utils/receiptDraftNormalizer';
import type { ParsedReceiptDraft } from '@/src/models/types';
import { formatCurrency } from '@/src/utils/priceParser';
import { resolveReceiptLineKind } from '@/src/utils/receiptMerchandiseFilter';
import { computeItemsSubtotal, roundMoney, computeSubtotalRelevantSum } from '@/src/utils/receiptTotals';

/** Shown in the UI when a line had a price but the product name could not be read. */
export const UNSCANNED_ITEM_LABEL = "Couldn't scan";

/** Short inline warning beside unscanned rows. */
export const UNSCANNED_ITEM_HINT = 'Blocked or unreadable on photo';

/** Longer hint for edit mode or tooltips. */
export const UNSCANNED_ITEM_HINT_DETAIL =
  'Hold the receipt flat, keep fingers off the text, or type the name manually.';

export function getEditableItemName(name: string): string {
  return isHiddenItemName(name) ? '' : name;
}

export function countUnscannedItems(items: Array<{ name: string }>): number {
  return items.filter((item) => isHiddenItemName(item.name)).length;
}

function hiddenItemIndices(items: Array<{ name: string }>): number[] {
  return items.flatMap((item, index) => (isHiddenItemName(item.name) ? [index] : []));
}

function longestConsecutiveRun(sortedIndices: number[]): number {
  if (sortedIndices.length === 0) return 0;
  let max = 1;
  let run = 1;
  for (let i = 1; i < sortedIndices.length; i++) {
    if (sortedIndices[i] === sortedIndices[i - 1] + 1) {
      run++;
      max = Math.max(max, run);
    } else {
      run = 1;
    }
  }
  return max;
}

/** Hidden rows are only the last lines — often missing printed names, not obstruction. */
function hiddenItemsAreTrailingOnly(
  items: Array<{ name: string }>,
  hiddenIndices: number[]
): boolean {
  if (hiddenIndices.length === 0) return false;
  const firstHidden = hiddenIndices[0]!;
  if (firstHidden === 0) return false;
  for (let index = firstHidden; index < items.length; index++) {
    if (!isHiddenItemName(items[index]!.name)) return false;
  }
  return true;
}

/**
 * True when the scan likely failed due to blur, a finger, or another blocker —
 * not when only the last few lines lack printed product names.
 */
export function shouldSuggestRescanForObstructedReceipt(options: {
  items: Array<{ name: string }>;
  ocrConfidence?: number | null;
}): boolean {
  const hiddenIndices = hiddenItemIndices(options.items);
  if (hiddenIndices.length === 0) return false;

  if (hiddenItemsAreTrailingOnly(options.items, hiddenIndices)) {
    return false;
  }

  const maxConsecutiveHidden = longestConsecutiveRun(hiddenIndices);

  // A block of 3+ unreadable rows mid-receipt usually means thumb/fold/blur.
  if (maxConsecutiveHidden >= 3) return true;

  // Many unreadable rows scattered or in multiple blocks.
  if (hiddenIndices.length >= 5) return true;

  // Low OCR confidence plus multiple failed rows → poor image quality.
  if (
    options.ocrConfidence != null &&
    options.ocrConfidence < 65 &&
    hiddenIndices.length >= 2
  ) {
    return true;
  }

  return false;
}

export function hasConsistentPrintedFooter(draft: {
  subtotal?: number;
  tax?: number;
  total?: number;
}): boolean {
  const { subtotal, tax, total } = draft;
  if (subtotal == null || subtotal <= 0 || total == null || total <= 0) return false;
  if (tax == null || tax < 0) return false;

  if (Math.abs(subtotal + tax - total) <= 0.05) return true;

  // Canadian HST-inclusive: line prices include tax; footer shows SUBTOTAL = TOTAL.
  if (tax > 0 && Math.abs(subtotal - total) <= 0.01) return true;

  return false;
}

/** Sum used to compare line items against the printed subtotal in validation UI. */
export function computeValidationSubtotalSum(
  draft: Pick<ParsedReceiptDraft, 'items' | 'subtotal' | 'tax' | 'total'>
): number {
  if (isCanadianTaxInclusiveFooter(draft.subtotal, draft.tax, draft.total)) {
    return computeItemsSubtotal(
      draft.items.filter((item) => resolveReceiptLineKind(item) === 'merchandise')
    );
  }
  return computeSubtotalRelevantSum(draft.items);
}

export const ITEMS_SUBTOTAL_TOLERANCE = 0.15;
export const CANADIAN_TAX_INCLUSIVE_GAP_TOLERANCE = 0.35;

export type ItemsSubtotalGap = {
  itemsSum: number;
  printedSubtotal: number;
  /** Positive when printed subtotal exceeds items sum. */
  gap: number;
  absGap: number;
};

export function getItemsSubtotalGap(
  draft: Pick<ParsedReceiptDraft, 'items' | 'subtotal' | 'tax' | 'total'>,
  tolerance = ITEMS_SUBTOTAL_TOLERANCE
): ItemsSubtotalGap | null {
  const printedSubtotal = draft.subtotal;
  if (printedSubtotal == null || printedSubtotal <= 0 || draft.items.length === 0) return null;

  const taxInclusive = isCanadianTaxInclusiveFooter(draft.subtotal, draft.tax, draft.total);
  const footerOk = hasConsistentPrintedFooter(draft);
  // Shelf/pre-tax line prices vs tax-inclusive printed subtotal is expected when footer adds up.
  if (footerOk && !taxInclusive) return null;

  const effectiveTolerance =
    taxInclusive && footerOk
      ? Math.max(tolerance, CANADIAN_TAX_INCLUSIVE_GAP_TOLERANCE)
      : tolerance;

  const itemsSum = roundMoney(computeValidationSubtotalSum(draft));
  const gap = roundMoney(printedSubtotal - itemsSum);
  const absGap = roundMoney(Math.abs(gap));
  if (absGap <= effectiveTolerance) return null;

  return { itemsSum, printedSubtotal, gap, absGap };
}

/** Inline breakdown for review UI when line items do not match the printed subtotal. */
export function formatItemsSubtotalGapDetail(
  draft: Pick<ParsedReceiptDraft, 'items' | 'subtotal' | 'tax' | 'total'>
): string | null {
  const gapInfo = getItemsSubtotalGap(draft);
  if (!gapInfo) return null;

  const { itemsSum, printedSubtotal, gap, absGap } = gapInfo;
  const direction = gap > 0 ? 'short' : 'over';
  const taxInclusive = isCanadianTaxInclusiveFooter(draft.subtotal, draft.tax, draft.total);

  let detail = `Lines ${formatCurrency(itemsSum)} vs printed subtotal ${formatCurrency(printedSubtotal)} (${formatCurrency(absGap)} ${direction})`;
  if (taxInclusive) {
    detail +=
      absGap <= CANADIAN_TAX_INCLUSIVE_GAP_TOLERANCE
        ? ' — common on HST-inclusive receipts (fees and rounding)'
        : ' — likely a misread price; payment fees may sit outside the printed subtotal';
  } else {
    detail += ' — check for missing items or misread prices';
  }
  return detail;
}

export function itemsSumMatchesSubtotal(
  draft: Pick<ParsedReceiptDraft, 'items' | 'subtotal' | 'tax' | 'total'>,
  tolerance = ITEMS_SUBTOTAL_TOLERANCE
): boolean {
  return getItemsSubtotalGap(draft, tolerance) == null;
}

/** Short totals gist for the review quality card (no dollar amounts). */
export function getTotalsMatchGist(draft: Pick<ParsedReceiptDraft, 'items' | 'subtotal' | 'tax' | 'total'>): string {
  const footerOk = hasConsistentPrintedFooter(draft);
  const itemsOk = itemsSumMatchesSubtotal(draft);

  if (footerOk && (itemsOk || !isCanadianTaxInclusiveFooter(draft.subtotal, draft.tax, draft.total))) {
    return 'Totals match';
  }
  if (footerOk && !itemsOk) return 'Subtotal gap';
  if (!footerOk && itemsOk) return 'Footer needs review';
  return 'Totals need review';
}

/** Verbose totals line with gap amounts (banner / edit detail only). */
export function getTotalsMatchDetail(draft: Pick<ParsedReceiptDraft, 'items' | 'subtotal' | 'tax' | 'total'>): string {
  const footerOk = hasConsistentPrintedFooter(draft);
  const gapDetail = formatItemsSubtotalGapDetail(draft);
  const itemsOk = gapDetail == null;

  if (footerOk && itemsOk) return 'Totals match';

  if (footerOk && !itemsOk) {
    if (gapDetail) return `Footer OK — ${gapDetail}`;
    if (isCanadianTaxInclusiveFooter(draft.subtotal, draft.tax, draft.total)) {
      return 'Footer OK — items may not sum (tax-inclusive / fees excluded)';
    }
    return 'Footer OK — items sum differs from subtotal';
  }

  if (!footerOk && itemsOk) return 'Items sum OK — footer needs review';
  if (gapDetail) return gapDetail;
  return 'Totals need review';
}
