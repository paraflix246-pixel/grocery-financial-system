import type { ParsedReceiptDraft } from '@/src/models/types';
import type { OcrRecognitionResult } from '@/src/services/ocrTypes';
import { cleanOcrLine } from '@/src/utils/textCleaner';

import { parseReceiptLines, parseReceiptText } from './receiptParser';

export function parseReceiptStructured(
  structuredLines: OcrRecognitionResult['structuredLines']
): ParsedReceiptDraft {
  if (!structuredLines?.length) {
    return parseReceiptText('');
  }

  const sorted = [...structuredLines].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
  const lines = sorted.map((line) => cleanOcrLine(line.text)).filter(Boolean);
  return parseReceiptLines(lines);
}

export function parseReceiptFromOcr(result: OcrRecognitionResult): ParsedReceiptDraft {
  if (result.structuredLines?.length) {
    return parseReceiptStructured(result.structuredLines);
  }
  return parseReceiptText(result.text);
}
