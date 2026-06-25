import type { OcrSource } from '@/src/services/ocrTypes';

import type { ReceiptParseMethod } from '@/src/services/receiptParsePipeline';

/** User-facing copy for the scan flow — no engine or API names. */
export const SCAN_REVIEW_HINT = 'Review items before saving';

/** Gentle pre-save reminder on the review screen — not a warning. */
export const RECEIPT_SAVE_REVIEW_HINT = 'Review receipt details before saving';

export const SCAN_PROCESSING_LABEL = 'Reading your receipt...';

export const SCAN_REFINING_LABEL = 'Checking your items...';

export const ENHANCED_SCAN_SETTING_TITLE = 'Better scan for hard receipts';

export const ENHANCED_SCAN_SETTING_DESCRIPTION =
  'Use this when photos are blurry or receipts are long.';

export const ENHANCED_SCAN_SETTING_NOTE =
  'Always manually double-check the final results before saving.';

export function ocrSourceLabel(source: OcrSource | null | undefined): string {
  switch (source) {
    case 'paddleocr':
    case 'deepread':
    case 'mlkit':
    case 'tesseract':
    case 'ocr_space':
    case 'cloud_vision':
      return 'Scanned';
    case 'fallback':
      return 'Manual entry';
    case 'empty':
      return 'No text detected';
    default:
      return 'Scanned';
  }
}

function parseMethodLabel(
  _parseMethod: ReceiptParseMethod,
  _ocrSource?: OcrSource | null
): string {
  return 'Receipt scanned';
}

export function extractionLabel(
  source: OcrSource | null | undefined,
  parseMethod?: ReceiptParseMethod | null,
  verified?: boolean,
  _deepseekAudited?: boolean
): string {
  if (
    parseMethod === 'openai' ||
    parseMethod === 'deepseek' ||
    parseMethod === 'paddleocr' ||
    parseMethod === 'deepread' ||
    (parseMethod === 'rules' && source === 'mlkit')
  ) {
    const label = parseMethodLabel(parseMethod ?? 'rules', source);
    return verified ? `${label} · confirmed` : label;
  }

  return ocrSourceLabel(source);
}

export function ocrProcessingHint(
  source: OcrSource | null | undefined,
  _parseMethod?: ReceiptParseMethod | null
): string {
  if (source === 'empty') {
    return 'Could not read receipt text — enter details manually';
  }

  return SCAN_REVIEW_HINT;
}
