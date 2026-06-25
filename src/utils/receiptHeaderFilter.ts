import { parseLineEndPrice } from '@/src/utils/priceParser';

export type ItemPriceContext = {
  subtotal?: number;
  total?: number;
};

/** Single grocery line items above this are almost always OCR header garbage. */
const MAX_GROCERY_ITEM_PRICE = 499.99;

export function looksLikeStoreHeaderLine(line: string): boolean {
  return /walmart|wal\s*mart|supercenter|target|costco|market|store\s*#/i.test(line);
}

/**
 * Walmart Canada survey / QR header OCR junk above the first product line.
 * Often mashes into the first item as "A:T:MATCHAL" while SPAGHETTI is the real name.
 */
export function looksLikeSurveyHeaderJunk(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  if (/^A\s*:\s*T\s*:/i.test(trimmed)) return true;
  if (/^survey\b/i.test(trimmed)) return true;
  if (/\bMATCHAL\b/i.test(trimmed) && /[:.]/.test(trimmed)) return true;
  if (/^AT\s*MATCHAL\b/i.test(trimmed)) return true;

  return false;
}

/**
 * OCR often mashes receipt header fields (TC#, store #, date) into one line with a
 * phantom price — e.g. "T0R 885 06/0/6//2 P0 885.06" from STORE #3885 + 06/08/26.
 */
export function looksLikeReceiptHeaderJunk(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/\b(tax|hst|gst|vat|sales tax)\b/i.test(trimmed)) return false;

  if (/^T0R\b/i.test(trimmed)) return true;
  if (/^TC[#\s]?\d/i.test(trimmed)) return true;
  if (/^T0[#\d]/i.test(trimmed)) return true;
  if (/\bTC[#\s]?\s*\d{3,}/i.test(trimmed)) return true;
  if (/STORE\s*#?\s*\d{3,5}/i.test(trimmed)) return true;

  if (
    (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed) || /\d{1,2}\/0\/\d/.test(trimmed)) &&
    /\$?\s*\d+\.\d{2}\s*$/.test(trimmed)
  ) {
    return true;
  }

  const digits = trimmed.replace(/\s/g, '').replace(/\D/g, '');
  const alpha = (trimmed.match(/[a-zA-Z]/g) ?? []).length;
  if (digits.length >= 12 && alpha <= 3 && !/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed)) {
    return true;
  }
  if (digits.length >= 10 && /\$?\s*\d+\.\d{2}\s*$/.test(trimmed) && alpha <= 8) {
    return true;
  }

  return false;
}

export function isPlausibleItemPrice(price: number, context: ItemPriceContext = {}): boolean {
  if (!Number.isFinite(price) || price <= 0) return false;
  if (price > MAX_GROCERY_ITEM_PRICE) return false;

  const subtotal = context.subtotal ?? 0;
  if (subtotal > 0 && price > subtotal + 0.01) return false;

  return true;
}

export function filterPlausibleItemPrices(
  prices: number[],
  context: ItemPriceContext = {}
): number[] {
  return prices.filter((price) => isPlausibleItemPrice(price, context));
}
