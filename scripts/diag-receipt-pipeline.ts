import fs from 'node:fs';
import path from 'node:path';

import { parseReceiptText } from '../src/services/receiptParser';
import { buildLineItemsFromOverlay, pickOcrDraftLineItems } from '../src/utils/ocrSpatialLayout';
import {
  finalizeReceiptDraft,
  resolvePrintedTotals,
  buildAuthoritativePriceList,
} from '../src/utils/receiptDraftNormalizer';
import { computeItemsSubtotal } from '../src/utils/receiptTotals';
import { fetchPaddleOcrOverlay } from '../src/services/ocr/paddleOcrServer';
import type { OcrLine } from '../src/services/ocr/ocrOverlayTypes';

async function main() {
const imagePath =
  process.argv[2] ||
  path.join(
    process.cwd(),
    'assets',
    'c__Users_shawa_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_675219315_122315980922199876_8168621789951131789_n-0ce69352-6dab-4f50-bf8d-0b4a5b6e5a29.png'
  );

if (!fs.existsSync(imagePath)) {
  console.error('Image not found:', imagePath);
  process.exit(1);
}

const imageBase64 = fs.readFileSync(imagePath).toString('base64');
const paddleUrl = process.env.PADDLEOCR_API_URL?.trim() || 'http://localhost:8089';

console.log('Image:', imagePath);
console.log('PaddleOCR:', paddleUrl);

const overlay = await fetchPaddleOcrOverlay(imageBase64, paddleUrl);
if (!overlay) {
  console.error('PaddleOCR returned no overlay');
  process.exit(1);
}

console.log('\n=== PaddleOCR rawText ===');
console.log(overlay.rawText);

const rawText = overlay.rawText.trim();
const textDraft = parseReceiptText(rawText);
const spatial = buildLineItemsFromOverlay(overlay.lines as OcrLine[]);
const ocrDraft = {
  ...textDraft,
  items: pickOcrDraftLineItems(textDraft.items, spatial.items, textDraft.subtotal, rawText),
};

console.log('\n=== OCR draft (before finalize) ===');
console.log(JSON.stringify(ocrDraft, null, 2));

const paddleFinal = finalizeReceiptDraft(ocrDraft, rawText, ocrDraft);
console.log('\n=== Paddle-only finalizeReceiptDraft ===');
console.log(JSON.stringify(paddleFinal, null, 2));

const printed = resolvePrintedTotals(ocrDraft, rawText, ocrDraft);
console.log('\n=== resolvePrintedTotals ===', printed);

const prices = buildAuthoritativePriceList(ocrDraft, rawText, printed.subtotal || 0, {
  tax: printed.tax,
  total: printed.total,
});
console.log('\n=== buildAuthoritativePriceList ===', prices, 'sum=', prices.reduce((a, b) => a + b, 0));

const aiDraft = {
  storeName: 'Walmart',
  date: '2026-06-08',
  subtotal: ocrDraft.subtotal,
  tax: ocrDraft.tax,
  total: ocrDraft.total,
  items: ocrDraft.items.map((item, index) => ({
    ...item,
    name: ocrDraft.items[Math.max(0, index - 1)]?.name ?? item.name,
  })),
};

const aiFinal = finalizeReceiptDraft(aiDraft, rawText, ocrDraft);
console.log('\n=== Shifted AI draft + finalizeReceiptDraft ===');
console.log(JSON.stringify(aiFinal, null, 2));
console.log('Items:', aiFinal.items.length, 'sum:', computeItemsSubtotal(aiFinal.items));
console.log('Item[1]:', aiFinal.items[1]?.name, aiFinal.items[1]?.price);
console.log('Item[4]:', aiFinal.items[4]?.name, aiFinal.items[4]?.price);

const ok =
  aiFinal.items.length === 22 &&
  aiFinal.items[1]?.name === 'PORK CHOPS FAMILY PK' &&
  aiFinal.items[1]?.price === 18.72 &&
  aiFinal.items[4]?.name === 'MILK 2 GAL' &&
  aiFinal.items[4]?.price === 7.96 &&
  aiFinal.total === 561.62;

console.log('\n=== PASS ===', ok);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
