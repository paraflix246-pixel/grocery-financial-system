import type { ParsedReceiptDraft } from '@/src/models/types';
import type { OcrSource } from '@/src/services/ocrTypes';
import { computeItemsSubtotal, computeReceiptTotals } from '@/src/utils/receiptTotals';

export type ReceiptParseWarning =
  | 'ocr_fallback'
  | 'ocr_low_confidence'
  | 'ocr_empty'
  | 'items_total_mismatch'
  | 'no_items'
  | 'no_total';

export function validateParsedReceipt(
  draft: ParsedReceiptDraft,
  options?: { ocrSource?: OcrSource; ocrConfidence?: number }
): ReceiptParseWarning[] {
  const warnings: ReceiptParseWarning[] = [];

  if (options?.ocrSource === 'fallback') warnings.push('ocr_fallback');
  if (options?.ocrSource === 'empty') warnings.push('ocr_empty');
  if (options?.ocrConfidence != null && options.ocrConfidence < 65) {
    warnings.push('ocr_low_confidence');
  }

  if (draft.items.length === 0) warnings.push('no_items');
  if (draft.total <= 0) warnings.push('no_total');

  if (draft.items.length > 0 && draft.total > 0) {
    const itemsSum = computeItemsSubtotal(draft.items);
    const resolved = computeReceiptTotals(draft);
    const matchesTotal = Math.abs(itemsSum - resolved.total) <= 0.1;
    const matchesBreakdown = Math.abs(resolved.subtotal + resolved.tax - resolved.total) <= 0.05;
    if (!matchesTotal && !matchesBreakdown) {
      warnings.push('items_total_mismatch');
    }
  }

  return warnings;
}

export function warningMessage(warning: ReceiptParseWarning): string {
  switch (warning) {
    case 'ocr_fallback':
      return 'OCR could not read your receipt — fields were not auto-filled. Enter details manually.';
    case 'ocr_low_confidence':
      return 'Low OCR confidence — double-check every line item and total before saving.';
    case 'ocr_empty':
      return 'No text was detected on this image. Try a clearer photo or enter the receipt manually.';
    case 'items_total_mismatch':
      return 'Line items do not add up to the receipt total. Review prices or edit the total.';
    case 'no_items':
      return 'No items were detected. Add line items before saving.';
    case 'no_total':
      return 'No total was detected. Enter the amount from your receipt.';
    default:
      return 'Review this receipt before saving.';
  }
}
