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

export async function recognizeTextFromImage(_imageUri: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return cleanOcrText(MOCK_RECEIPT_TEXT);
}
