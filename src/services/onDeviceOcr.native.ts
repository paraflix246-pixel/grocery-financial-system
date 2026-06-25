import { recognizeTextWithMlkit } from '@/src/services/ocr/mlkitOcr';

import type { OcrRecognitionResult } from './ocrTypes';

/** On-device ML Kit OCR (rn-mlkit-ocr). Requires native dev build — not Expo Go. */
export async function recognizeOnDeviceDetailed(
  imageUri: string
): Promise<OcrRecognitionResult> {
  try {
    return await recognizeTextWithMlkit(imageUri);
  } catch (error) {
    console.warn('ML Kit OCR unavailable:', error);
    return { text: '', source: 'empty', structuredLines: [] };
  }
}
