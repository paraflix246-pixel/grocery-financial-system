import type { ParsedReceiptDraft } from '@/src/models/types';
import { guessDateFromText, todayISO } from '@/src/utils/dateParser';
import { parsePrice } from '@/src/utils/priceParser';
import { cleanOcrLine } from '@/src/utils/textCleaner';

const TOTAL_KEYWORDS = ['total', 'amount due', 'balance due', 'grand total'];
const SUBTOTAL_KEYWORDS = ['subtotal', 'sub total', 'sub-total'];
const TAX_KEYWORDS = ['tax', 'sales tax', 'hst', 'gst'];

export function parseReceiptText(rawText: string): ParsedReceiptDraft {
  const lines = rawText.split('\n').map(cleanOcrLine).filter(Boolean);
  let storeName = 'Unknown Store';
  let date = todayISO();
  let subtotal: number | undefined;
  let tax: number | undefined;
  let total = 0;
  const items: ParsedReceiptDraft['items'] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    if (i === 0 && !parsePrice(line)) {
      storeName = line;
      continue;
    }

    const guessed = guessDateFromText(line);
    if (guessed) {
      date = guessed;
      continue;
    }

    if (SUBTOTAL_KEYWORDS.some((k) => lower.includes(k))) {
      subtotal = parsePrice(line) ?? subtotal;
      continue;
    }
    if (TAX_KEYWORDS.some((k) => lower.includes(k))) {
      tax = parsePrice(line) ?? tax;
      continue;
    }
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) {
      total = parsePrice(line) ?? total;
      continue;
    }

    const price = parsePrice(line);
    if (price != null) {
      const namePart = line.replace(/\$?\s*\d+\.\d{2}\s*$/, '').trim();
      if (namePart.length > 0) {
        items.push({ name: namePart, price, quantity: 1 });
      }
    }
  }

  if (total === 0 && items.length > 0) {
    total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (tax) total += tax;
  }

  return { storeName, date, subtotal, tax, total, items };
}
