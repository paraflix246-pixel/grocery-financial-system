/** Heuristic: does OCR text look like a grocery receipt (not a random photo)? */

export type ReceiptLikelihoodResult = {
  likelyReceipt: boolean;
  reason?: 'too_short' | 'no_prices' | 'no_receipt_signals';
};

export function assessReceiptLikelihood(text: string): ReceiptLikelihoodResult {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 12) {
    return { likelyReceipt: false, reason: 'too_short' };
  }

  const prices = cleaned.match(/\d+\.\d{2}/g) ?? [];
  if (prices.length < 1) {
    return { likelyReceipt: false, reason: 'no_prices' };
  }

  const lower = cleaned.toLowerCase();
  const hasSummary =
    lower.includes('total') ||
    lower.includes('subtotal') ||
    lower.includes('tax') ||
    lower.includes('amount due') ||
    lower.includes('balance due') ||
    lower.includes('change') ||
    /\bstore\b/.test(lower) ||
    /\breceipt\b/.test(lower);

  if (!hasSummary && prices.length < 2) {
    return { likelyReceipt: false, reason: 'no_receipt_signals' };
  }

  return { likelyReceipt: true };
}
