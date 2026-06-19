import type { OcrSource } from '@/src/services/ocrTypes';
import type { ReceiptParseMethod } from '@/src/services/receiptAiCleanup';

export function ocrSourceLabel(source: OcrSource | null | undefined): string {
  switch (source) {
    case 'mlkit':
      return 'On-device (ML Kit)';
    case 'tesseract':
      return 'On-device (Tesseract)';
    case 'ocr_space':
      return 'Enhanced OCR (OCR.space)';
    case 'cloud_vision':
      return 'Enhanced OCR (Google Vision)';
    case 'fallback':
      return 'Manual entry';
    case 'empty':
      return 'No text detected';
    default:
      return 'Scan';
  }
}

function parseMethodLabel(parseMethod: ReceiptParseMethod, verified?: boolean): string {
  switch (parseMethod) {
    case 'openai':
      return verified ? 'AI scan (ChatGPT · double-checked)' : 'AI scan (ChatGPT)';
    case 'deepseek':
      return 'AI cleanup (DeepSeek)';
    default:
      return 'Rules';
  }
}

export function extractionLabel(
  source: OcrSource | null | undefined,
  parseMethod?: ReceiptParseMethod | null,
  verified?: boolean
): string {
  if (parseMethod === 'openai') {
    return parseMethodLabel(parseMethod, verified);
  }

  const ocr = ocrSourceLabel(source);
  if (parseMethod === 'deepseek') {
    return `${ocr} → ${parseMethodLabel(parseMethod)}`;
  }
  return ocr;
}

export function ocrProcessingHint(
  source: OcrSource | null | undefined,
  parseMethod?: ReceiptParseMethod | null
): string {
  if (parseMethod === 'openai') {
    return 'Reading receipt with ChatGPT and cross-checking OCR — review before saving';
  }
  if (parseMethod === 'deepseek') {
    return 'Cleaning receipt with AI — review and edit before saving';
  }

  switch (source) {
    case 'mlkit':
      return 'Reading text with ML Kit — review and edit before saving';
    case 'tesseract':
      return 'Reading text with on-device OCR — review and edit before saving';
    case 'ocr_space':
    case 'cloud_vision':
      return 'Reading text with enhanced cloud OCR — review and edit before saving';
    case 'empty':
      return 'Could not read receipt text — enter details manually';
    default:
      return 'Processing receipt...';
  }
}
