import type { ParsedReceiptDraft } from '@/src/models/types';
import { isCanadianTaxInclusiveFooter } from '@/src/utils/receiptDraftNormalizer';
import { looksLikeSurveyHeaderJunk } from '@/src/utils/receiptHeaderFilter';
import {
  classifyReceiptLineKind,
  isPaymentLineName,
} from '@/src/utils/receiptMerchandiseFilter';
import { computeValidationSubtotalSum } from '@/src/utils/receiptItemLabels';
import { validateParsedReceipt } from '@/src/utils/receiptValidation';

export type ReceiptAiCleanupReason =
  | 'needs_review'
  | 'parse_unverified'
  | 'items_total_mismatch'
  | 'survey_junk'
  | 'missing_fee_line';

const SUBTOTAL_MISMATCH_THRESHOLD = 0.15;

export function draftHasSurveyJunk(draft: ParsedReceiptDraft): boolean {
  return draft.items.some((item) => looksLikeSurveyHeaderJunk(item.name));
}

export function ocrTextHasPaymentFeeLine(ocrText: string): boolean {
  return ocrText
    .split(/\r?\n/)
    .some((line) => line.trim().length > 0 && isPaymentLineName(line));
}

export function draftHasFeeLine(draft: ParsedReceiptDraft): boolean {
  return draft.items.some(
    (item) => (item.lineKind ?? classifyReceiptLineKind(item.name)) === 'fee'
  );
}

export function hasMissingFeeLine(draft: ParsedReceiptDraft, ocrText?: string): boolean {
  if (draftHasFeeLine(draft)) return false;
  if (ocrText?.trim() && ocrTextHasPaymentFeeLine(ocrText)) return true;
  const merchandiseCount = draft.items.filter(
    (item) => (item.lineKind ?? classifyReceiptLineKind(item.name)) === 'merchandise'
  ).length;
  // DeepRead flat text often truncates before CHARGE PYMT on long Walmart Canada receipts.
  if (
    isCanadianTaxInclusiveFooter(draft.subtotal, draft.tax, draft.total) &&
    merchandiseCount >= 10
  ) {
    return true;
  }
  return false;
}

export function hasItemsSubtotalMismatch(draft: ParsedReceiptDraft): boolean {
  return validateParsedReceipt(draft, { parseMethod: 'deepread' }).includes(
    'items_total_mismatch'
  );
}

export function getReceiptAiCleanupReasons(options: {
  draft: ParsedReceiptDraft;
  ocrText?: string;
  needsReview?: boolean;
  parseVerified?: boolean;
}): ReceiptAiCleanupReason[] {
  const reasons: ReceiptAiCleanupReason[] = [];

  if (options.needsReview === true) {
    reasons.push('needs_review');
  } else if (options.parseVerified === false) {
    reasons.push('parse_unverified');
  }

  if (hasItemsSubtotalMismatch(options.draft)) {
    const subtotal = options.draft.subtotal ?? 0;
    if (subtotal > 0) {
      const gap = Math.abs(computeValidationSubtotalSum(options.draft) - subtotal);
      if (gap > SUBTOTAL_MISMATCH_THRESHOLD) {
        reasons.push('items_total_mismatch');
      }
    } else {
      reasons.push('items_total_mismatch');
    }
  }

  if (draftHasSurveyJunk(options.draft)) {
    reasons.push('survey_junk');
  }

  if (hasMissingFeeLine(options.draft, options.ocrText)) {
    reasons.push('missing_fee_line');
  }

  return reasons;
}

export function shouldRunReceiptAiCleanup(options: {
  draft: ParsedReceiptDraft;
  ocrText?: string;
  needsReview?: boolean;
  parseVerified?: boolean;
}): boolean {
  return getReceiptAiCleanupReasons(options).length > 0;
}
