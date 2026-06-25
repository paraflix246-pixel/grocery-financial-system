import type { ReceiptParseMethod } from '@/src/services/receiptParsePipeline';

import type { ParsedReceiptDraft } from '@/src/models/types';
import type { OcrSource } from '@/src/services/ocrTypes';
import { countUnscannedItems, formatItemsSubtotalGapDetail, hasConsistentPrintedFooter, computeValidationSubtotalSum, CANADIAN_TAX_INCLUSIVE_GAP_TOLERANCE } from '@/src/utils/receiptItemLabels';
import { computeItemsSubtotal, computeReceiptTotals } from '@/src/utils/receiptTotals';
import { isCanadianTaxInclusiveFooter } from '@/src/utils/receiptDraftNormalizer';

export type ReceiptParseWarning =
  | 'ocr_fallback'
  | 'ocr_low_confidence'
  | 'ocr_empty'
  | 'items_total_mismatch'
  | 'unscanned_items'
  | 'no_items'
  | 'no_total';

export function validateParsedReceipt(
  draft: ParsedReceiptDraft,
  options?: {
    ocrSource?: OcrSource;
    ocrConfidence?: number;
    parseMethod?: ReceiptParseMethod | null;
  }
): ReceiptParseWarning[] {
  const warnings: ReceiptParseWarning[] = [];
  const ocrParsed =
    options?.parseMethod === 'openai' ||
    options?.parseMethod === 'deepseek' ||
    options?.parseMethod === 'paddleocr' ||
    options?.parseMethod === 'deepread' ||
    options?.ocrSource === 'mlkit';
  if (options?.ocrSource === 'fallback') warnings.push('ocr_fallback');
  if (options?.ocrSource === 'empty' && !ocrParsed) warnings.push('ocr_empty');
  if (options?.ocrConfidence != null && options.ocrConfidence < 65) {
    warnings.push('ocr_low_confidence');
  }

  if (draft.items.length === 0) warnings.push('no_items');
  if (draft.total <= 0) warnings.push('no_total');

  if (countUnscannedItems(draft.items) > 0) {
    warnings.push('unscanned_items');
  }

  const printedFooterOk = hasConsistentPrintedFooter(draft);

  if (draft.items.length > 0 && !printedFooterOk) {
    const taxInclusive = isCanadianTaxInclusiveFooter(draft.subtotal, draft.tax, draft.total);
    const itemsSum = computeValidationSubtotalSum(draft);
    const tax = draft.tax ?? 0;
    let shouldWarn = false;

    if (draft.subtotal != null && draft.subtotal > 0) {
      const tolerance = taxInclusive ? CANADIAN_TAX_INCLUSIVE_GAP_TOLERANCE : 0.15;
      if (Math.abs(itemsSum - draft.subtotal) > tolerance) {
        shouldWarn = true;
      }
    }

    if (draft.total > 0 && Math.abs(itemsSum + tax - draft.total) > 0.05) {
      shouldWarn = true;
    } else if ((draft.subtotal == null || draft.subtotal <= 0) && draft.total > 0) {
      const resolved = computeReceiptTotals(draft);
      const matchesTotal = Math.abs(itemsSum - resolved.total) <= 0.1;
      const matchesBreakdown =
        Math.abs(resolved.subtotal + resolved.tax - resolved.total) <= 0.05;
      if (!matchesTotal && !matchesBreakdown) {
        shouldWarn = true;
      }
    }

    if (shouldWarn) {
      warnings.push('items_total_mismatch');
    }
  }

  return warnings;
}

/** Warnings shown in the top banner — unscanned rows carry their own inline label. */
export function getReceiptBannerWarnings(warnings: ReceiptParseWarning[]): ReceiptParseWarning[] {
  return warnings.filter((warning) => warning !== 'unscanned_items');
}

const OCR_BANNER_WARNINGS: ReceiptParseWarning[] = [
  'ocr_empty',
  'ocr_fallback',
  'ocr_low_confidence',
];

/** At most two fused banner messages — one OCR issue, one structural/totals issue. */
export function getConsolidatedBannerMessages(
  warnings: ReceiptParseWarning[],
  draft?: ParsedReceiptDraft
): string[] {
  const banner = getReceiptBannerWarnings(warnings);
  if (banner.length === 0) return [];

  const messages: string[] = [];
  const ocrWarning = OCR_BANNER_WARNINGS.find((code) => banner.includes(code));
  if (ocrWarning) {
    messages.push(warningMessage(ocrWarning, { draft }));
  }

  if (banner.includes('no_items')) {
    messages.push(warningMessage('no_items', { draft }));
  } else if (banner.includes('no_total')) {
    messages.push(warningMessage('no_total', { draft }));
  } else if (banner.includes('items_total_mismatch')) {
    messages.push(warningMessage('items_total_mismatch', { draft }));
  }

  return messages.slice(0, 2);
}

/** Hide inline subtotal gap when the banner already covers it. */
export function shouldShowInlineSubtotalGap(warnings: ReceiptParseWarning[]): boolean {
  return !warnings.includes('items_total_mismatch');
}

export function warningMessage(
  warning: ReceiptParseWarning,
  context?: { unscannedCount?: number; draft?: ParsedReceiptDraft }
): string {
  switch (warning) {
    case 'ocr_fallback':
      return "We couldn't read your receipt — enter details manually.";
    case 'ocr_low_confidence':
      return 'Some items may not have been read correctly — double-check every line item and total before saving.';
    case 'ocr_empty':
      return 'No text was detected on this image. Try a clearer photo or enter the receipt manually.';
    case 'items_total_mismatch': {
      const gapDetail = context?.draft ? formatItemsSubtotalGapDetail(context.draft) : null;
      if (gapDetail) {
        return `Line items do not add up to the printed subtotal. ${gapDetail}. Check prices in Edit or add a missing fee line.`;
      }
      return 'Line items do not add up to the printed totals. Check prices in Edit or add a missing fee line.';
    }
    case 'unscanned_items': {
      const count = context?.unscannedCount ?? 0;
      if (count === 1) return "1 item couldn't be scanned — add a name below.";
      if (count > 1) return `${count} items couldn't be scanned — add names below.`;
      return "Some items couldn't be scanned — add names below.";
    }
    case 'no_items':
      return 'No items were detected. Add line items before saving.';
    case 'no_total':
      return 'No total was detected. Enter the amount from your receipt.';
    default:
      return 'Review this receipt before saving.';
  }
}
