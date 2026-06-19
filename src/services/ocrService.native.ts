import { cleanOcrText } from '@/src/utils/textCleaner';

const MOCK_RECEIPT_TEXT = `WHOLE FOODS MARKET
123 Main Street
06/18/2026

Organic Eggs        4.99
Whole Milk 1gal     3.49
Bananas 2lb         1.29
Bread Loaf          2.99

Subtotal           12.76
Tax                 0.89
TOTAL              13.65`;

export async function recognizeTextFromImage(imageUri: string): Promise<string> {
  try {
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    const result = await TextRecognition.recognize(imageUri);
    const text = result.blocks?.map((b: { text: string }) => b.text).join('\n') ?? result.text ?? '';
    return cleanOcrText(text || MOCK_RECEIPT_TEXT);
  } catch {
    return cleanOcrText(MOCK_RECEIPT_TEXT);
  }
}
