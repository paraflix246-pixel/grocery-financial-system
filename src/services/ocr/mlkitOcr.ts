import type { OcrRecognitionResult } from '@/src/services/ocrTypes';

/** ML Kit OCR is not available on web — use PaddleOCR via scan.web.tsx. */
export async function recognizeTextWithMlkit(_imageUri: string): Promise<OcrRecognitionResult> {
  throw new Error('ML Kit OCR is only available on iOS and Android native dev builds.');
}
