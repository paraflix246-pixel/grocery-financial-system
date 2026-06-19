import { cleanOcrText } from '@/src/utils/textCleaner';

import type { OcrSource, OcrRecognitionResult } from './ocrTypes';

const MIN_TEXT_LENGTH = 12;

function looksLikeReceiptText(text: string): boolean {
  const prices = text.match(/\d+\.\d{2}/g) ?? [];
  if (prices.length < 2) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('total') ||
    lower.includes('subtotal') ||
    lower.includes('tax') ||
    prices.length >= 3
  );
}

export async function recognizeTextFromImageDetailed(
  imageUri: string
): Promise<OcrRecognitionResult> {
  try {
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    const result = await TextRecognition.recognize(imageUri);
    const text = result.blocks?.map((b: { text: string }) => b.text).join('\n') ?? result.text ?? '';
    const cleaned = cleanOcrText(text.trim());
    if (cleaned.length >= MIN_TEXT_LENGTH && looksLikeReceiptText(cleaned)) {
      return { text: cleaned, source: 'tesseract' };
    }
  } catch (error) {
    console.warn('ML Kit OCR unavailable:', error);
  }

  return { text: '', source: 'empty' };
}

export async function recognizeTextFromImage(imageUri: string): Promise<string> {
  const result = await recognizeTextFromImageDetailed(imageUri);
  return result.text;
}
