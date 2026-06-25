import type { ReceiptLineKind } from '@/src/models/types';

/** Card/payment fee rows (e.g. Walmart Canada "CHARGE PYMT D68 QTY 1 $4.06"). */
export function isPaymentLineName(name: string): boolean {
  const normalized = normalizeMerchandiseName(name).toLowerCase();
  if (/^(visa|mastercard|amex|debit|credit|cash|interac|approved|change due)\b/.test(normalized)) {
    return true;
  }
  if (/\bcharge\s+pymt\b/.test(normalized)) return true;
  if (/\bpymt\b/.test(normalized) && (/\bd\d+\b/.test(normalized) || /\bqty\b/.test(normalized))) {
    return true;
  }
  if (/\b(card\s+fee|payment\s+fee|surcharge|bag\s+fee)\b/.test(normalized)) return true;
  if (/^qty\s+\d+$/i.test(normalized)) return true;
  return false;
}

/** OCR garbage from credit-card promo / footer ad blocks below merchandise. */
export function looksLikePromoFooterJunk(name: string): boolean {
  const normalized = normalizeMerchandiseName(name);
  if (
    /\b(bread\s+only|caratoes|tomrth|umbery\s+dis|corfort|credit\s+card\s+application|apply\s+(?:now|today))\b/i.test(
      normalized
    )
  ) {
    return true;
  }
  if (/^sh\s+\S/i.test(normalized) && normalized.length <= 12) return true;
  return false;
}

/** Subtotal / tax / total labels — never real product rows. */
export function isTotalsFooterLabel(name: string): boolean {
  const normalized = normalizeMerchandiseName(name).toLowerCase();
  if (
    /^(sub\s*total|subtotal|sales tax|tax|hst|gst|vat|total|grand total|amount due|balance due|barcode|change due|tc#|paid|tender|payment)(?:[\s.]+.*)?$/.test(
      normalized
    )
  ) {
    return true;
  }
  return /\b(sub\s*total|amount due|balance due|change due)\b/.test(normalized);
}

export function classifyReceiptLineKind(name: string): ReceiptLineKind {
  if (isPaymentLineName(name)) return 'fee';
  if (looksLikePromoFooterJunk(name)) return 'other';
  return 'merchandise';
}

/** Resolve line kind from stored tag or item name heuristics. */
export function resolveReceiptLineKind(item: {
  name: string;
  lineKind?: ReceiptLineKind;
}): ReceiptLineKind {
  return item.lineKind ?? classifyReceiptLineKind(item.name);
}

/** True when a receipt line should appear in Buy Again / frequent-item suggestions. */
export function isBuyAgainEligibleItem(name: string, lineKind?: ReceiptLineKind): boolean {
  if (isPaymentLineName(name)) return false;
  const kind = lineKind ?? classifyReceiptLineKind(name);
  return kind === 'merchandise';
}

/** Short label for payment/fee rows in the review UI. */
export function formatFeeLineLabel(name: string): string {
  const normalized = normalizeMerchandiseName(name);
  if (/\bcharge\s+pymt\b/i.test(normalized)) return 'Payment fee';
  if (/\b(card\s+fee|payment\s+fee|surcharge|bag\s+fee)\b/i.test(normalized)) return 'Fee';
  return normalized;
}

function normalizeMerchandiseName(name: string): string {
  return name
    .replace(/\s+H\s*$/i, '')
    .replace(/\s+_\s*$/g, '')
    .replace(/\.+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
