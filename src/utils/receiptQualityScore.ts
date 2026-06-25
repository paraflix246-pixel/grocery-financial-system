import type { ParsedReceiptDraft } from '@/src/models/types';
import type { ReceiptParseWarning } from '@/src/utils/receiptValidation';
import { hasReceiptPrintedAddress } from '@/src/utils/storeLocationUtils';
import {
  getTotalsMatchGist,
  hasConsistentPrintedFooter,
  itemsSumMatchesSubtotal,
} from '@/src/utils/receiptItemLabels';

export type ReceiptQualitySummary = {
  headline: string;
  details: string[];
  addressFound: boolean;
  totalsMatch: boolean;
};

export function buildReceiptQualitySummary(
  draft: ParsedReceiptDraft,
  warnings: ReceiptParseWarning[] = []
): ReceiptQualitySummary {
  const itemCount = draft.items.length;
  const hiddenCount = draft.items.filter((item) => item.name === '(name hidden)').length;
  const readableItems = itemCount - hiddenCount;
  const addressOnReceipt = hasReceiptPrintedAddress(draft);
  const addressFound = addressOnReceipt;
  const totalsMatch = itemsSumMatchesSubtotal(draft) && getTotalsMatchGist(draft) === 'Totals match';
  const errorCodes = new Set<ReceiptParseWarning>(['no_items', 'no_total', 'items_total_mismatch']);
  const errorCount = warnings.filter((warning) => {
    if (warning !== 'items_total_mismatch') return errorCodes.has(warning);
    if (hasConsistentPrintedFooter(draft)) {
      return false;
    }
    return errorCodes.has(warning);
  }).length;
  const ocrWarningCount = warnings.filter((warning) =>
    ['ocr_fallback', 'ocr_empty', 'ocr_low_confidence'].includes(warning)
  ).length;
  const hasSubtotalGap = warnings.includes('items_total_mismatch');

  const details: string[] = [];
  if (itemCount === 0) {
    details.push('No line items detected');
  } else if (hiddenCount > 0) {
    details.push(`${readableItems}/${itemCount} items readable`);
  } else {
    details.push(`${itemCount} items readable`);
  }

  details.push(
    addressOnReceipt
      ? draft.storeRegion?.trim()
        ? 'Address found'
        : 'State missing'
      : draft.storeRegion?.trim()
        ? 'No address on receipt'
        : 'Address missing'
  );
  details.push(getTotalsMatchGist(draft));
  if (ocrWarningCount > 0 && !hasSubtotalGap) {
    details.push(`${ocrWarningCount} scan issue${ocrWarningCount === 1 ? '' : 's'}`);
  } else if (errorCount > 0 && !hasSubtotalGap) {
    details.push(`${errorCount} issue${errorCount === 1 ? '' : 's'} to fix`);
  }

  let headline = 'Receipt looks good';
  if (errorCount > 0 || itemCount === 0) headline = 'Review before saving';
  else if (!totalsMatch || hiddenCount > 0 || !addressFound) headline = 'Mostly readable — double-check details';

  return {
    headline,
    details,
    addressFound,
    totalsMatch,
  };
}
