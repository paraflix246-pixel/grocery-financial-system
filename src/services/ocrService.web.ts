import { cleanOcrText } from '@/src/utils/textCleaner';

const MOCK_RECEIPTS = [
  `WHOLE FOODS MARKET
123 Main Street
06/18/2026

Organic Eggs        4.99
Whole Milk 1gal     3.49
Bananas 2lb         1.29
Bread Loaf          2.99

Subtotal           12.76
Tax                 0.89
TOTAL              13.65`,
  `TARGET STORE #1842
456 Oak Avenue
06/17/2026

Cheerios 18oz       4.29
Ground Beef 1lb     5.99
Paper Towels        6.49
Sparkling Water     3.99

Subtotal           20.76
Tax                 1.45
TOTAL              22.21`,
  `WALMART SUPERCENTER
789 Commerce Blvd
06/16/2026

Great Value Milk    2.78
Bananas             1.18
White Bread         1.47
Large Eggs 12ct     2.94

Subtotal            8.37
Tax                 0.58
TOTAL               8.95`,
  `KROGER MARKET
220 Elm Street
06/15/2026

Chicken Breast 2lb  7.98
Greek Yogurt        4.49
Orange Juice        3.79
Pasta Sauce         2.29

Subtotal           18.55
Tax                 1.30
TOTAL              19.85`,
];

function hashUri(uri: string): number {
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    hash = (hash * 31 + uri.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export async function recognizeTextFromImage(imageUri: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const index = hashUri(imageUri) % MOCK_RECEIPTS.length;
  return cleanOcrText(MOCK_RECEIPTS[index]);
}
