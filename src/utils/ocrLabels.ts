import type { OcrSource } from '@/src/services/ocrTypes';

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

export function ocrProcessingHint(source: OcrSource | null | undefined): string {
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
