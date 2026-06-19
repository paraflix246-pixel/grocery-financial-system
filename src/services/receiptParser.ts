import type { ParsedReceiptDraft } from '@/src/models/types';
import { computeItemsSubtotal, computeReceiptTotals } from '@/src/utils/receiptTotals';
import { guessDateFromText, todayISO } from '@/src/utils/dateParser';
import { parseLineEndPrice, parsePrice } from '@/src/utils/priceParser';
import { cleanOcrLine } from '@/src/utils/textCleaner';

const SUBTOTAL_KEYWORDS = ['subtotal', 'sub total', 'sub-total', 'merchandise'];
const TAX_KEYWORDS = ['tax', 'sales tax', 'hst', 'gst', 'vat'];
const TOTAL_KEYWORDS = ['total', 'amount due', 'balance due', 'grand total', 'total due'];

const KNOWN_STORES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /walmart|wal\s*mart/i, name: 'Walmart' },
  { pattern: /target/i, name: 'Target' },
  { pattern: /aldi/i, name: 'Aldi' },
  { pattern: /kroger/i, name: 'Kroger' },
  { pattern: /whole\s*foods/i, name: 'Whole Foods' },
  { pattern: /trader\s*joe/i, name: "Trader Joe's" },
  { pattern: /costco/i, name: 'Costco' },
  { pattern: /sam'?s\s*club/i, name: "Sam's Club" },
  { pattern: /publix/i, name: 'Publix' },
  { pattern: /safeway/i, name: 'Safeway' },
  { pattern: /heb\b/i, name: 'HEB' },
  { pattern: /meijer/i, name: 'Meijer' },
  { pattern: /food\s*lion/i, name: 'Food Lion' },
  { pattern: /sprouts/i, name: 'Sprouts' },
  { pattern: /wegmans/i, name: 'Wegmans' },
];

const SKIP_LINE_PATTERNS = [
  /^(visa|mastercard|amex|american express|discover|debit|credit|cash|change due|change|approved|authorization|auth code|account|card ending|chip read|insert card|tap card|terminal|transaction|trans id|ref #|reference|seq #|batch|aid |mid |tc |tvr )/i,
  /thank you/i,
  /visit us/i,
  /customer copy/i,
  /member savings/i,
  /^save \$/i,
  /^you saved/i,
  /^total savings/i,
  /^coupon/i,
  /^discount/i,
  /^rewards/i,
  /^points/i,
  /^balance/i,
  /^tender/i,
  /^payment/i,
  /^paid/i,
  /^return policy/i,
  /^survey/i,
  /^www\./i,
  /\.com\b/i,
  /^tel[:\s]/i,
  /^phone[:\s]/i,
  /^store #/i,
  /^op #/i,
  /^te #/i,
  /^tr #/i,
  /^\*\*\*/,
  /^-{3,}/,
  /^={3,}/,
];

function isSummaryKeyword(lower: string, keywords: string[]): boolean {
  return keywords.some((keyword) => lower.includes(keyword));
}

function isSubtotalLine(lower: string): boolean {
  return isSummaryKeyword(lower, SUBTOTAL_KEYWORDS);
}

function isTaxLine(lower: string): boolean {
  if (isSubtotalLine(lower)) return false;
  return isSummaryKeyword(lower, TAX_KEYWORDS);
}

function isTotalLine(lower: string): boolean {
  if (isSubtotalLine(lower)) return false;
  if (isTaxLine(lower)) return false;
  if (/\btotal\b/.test(lower)) return true;
  return TOTAL_KEYWORDS.filter((k) => k !== 'total').some((k) => lower.includes(k));
}

function shouldSkipLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (SKIP_LINE_PATTERNS.some((pattern) => pattern.test(lower))) return true;
  if (/^\d{10,}$/.test(line.replace(/\s/g, ''))) return true;
  if (/^\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?$/i.test(line)) return true;
  return false;
}

function isAddressOrPhoneLine(line: string): boolean {
  if (/\b(st|street|ave|avenue|blvd|boulevard|rd|road|dr|drive|ln|lane|way|suite|ste)\b/i.test(line)) {
    return true;
  }
  if (/\(\d{3}\)|\d{3}-\d{3}-\d{4}/.test(line)) return true;
  if (/^\d+\s+\w/.test(line) && parsePrice(line) == null) return true;
  return false;
}

function scoreStoreCandidate(line: string): number {
  if (parsePrice(line) != null) return -1;
  if (guessDateFromText(line)) return -1;
  if (isAddressOrPhoneLine(line)) return -1;
  if (line.length < 3 || line.length > 48) return -1;
  if (/^\d+$/.test(line)) return -1;

  const alphaChars = (line.match(/[a-zA-Z]/g) ?? []).length;
  if (alphaChars < 3) return -1;

  for (const store of KNOWN_STORES) {
    if (store.pattern.test(line)) return 100;
  }

  let score = alphaChars;
  if (/market|grocery|supercenter|foods|store|shop/i.test(line)) score += 20;
  if (line === line.toUpperCase() && alphaChars >= 4) score += 10;
  return score;
}

function detectStoreName(lines: string[]): string {
  const headerLines = lines.slice(0, 8);
  let bestName = 'Unknown Store';
  let bestScore = 0;

  for (const line of headerLines) {
    for (const store of KNOWN_STORES) {
      if (store.pattern.test(line)) return store.name;
    }
    const score = scoreStoreCandidate(line);
    if (score > bestScore) {
      bestScore = score;
      bestName = line;
    }
  }

  return bestName;
}

function parseItemLine(line: string): { name: string; price: number; quantity: number } | null {
  const qtyAtPrice = line.match(/^(.+?)\s+(\d+)\s*[@xX]\s*\$?\s*(\d+\.\d{2})\s*$/);
  if (qtyAtPrice) {
    const quantity = parseInt(qtyAtPrice[2], 10);
    const unitPrice = parseFloat(qtyAtPrice[3]);
    const name = qtyAtPrice[1].trim();
    if (name.length > 0 && quantity > 0) {
      return { name, price: unitPrice * quantity, quantity: 1 };
    }
  }

  const price = parseLineEndPrice(line);
  if (price == null) return null;

  const namePart = line.replace(/\$?\s*\d+\.\d{2}\s*$/, '').trim();
  if (namePart.length < 2) return null;
  if (/^\d+$/.test(namePart.replace(/\s/g, ''))) return null;
  if (isSummaryKeyword(namePart.toLowerCase(), [...SUBTOTAL_KEYWORDS, ...TAX_KEYWORDS, ...TOTAL_KEYWORDS])) {
    return null;
  }

  return { name: namePart, price, quantity: 1 };
}

export function parseReceiptLines(lines: string[]): ParsedReceiptDraft {
  const storeName = detectStoreName(lines);
  let date = todayISO();
  let subtotal: number | undefined;
  let tax: number | undefined;
  let total = 0;
  const items: ParsedReceiptDraft['items'] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (shouldSkipLine(line)) continue;

    const guessed = guessDateFromText(line);
    if (guessed) {
      date = guessed;
      continue;
    }

    if (isSubtotalLine(lower)) {
      subtotal = parseLineEndPrice(line) ?? parsePrice(line) ?? subtotal;
      continue;
    }
    if (isTaxLine(lower)) {
      tax = parseLineEndPrice(line) ?? parsePrice(line) ?? tax;
      continue;
    }
    if (isTotalLine(lower)) {
      total = parseLineEndPrice(line) ?? parsePrice(line) ?? total;
      continue;
    }

    const item = parseItemLine(line);
    if (item) items.push(item);
  }

  if (subtotal == null && items.length > 0) {
    subtotal = computeItemsSubtotal(items);
  }

  const { subtotal: resolvedSubtotal, tax: resolvedTax, total: resolvedTotal } = computeReceiptTotals({
    items,
    subtotal,
    tax,
    total,
  });

  return {
    storeName,
    date,
    subtotal: resolvedSubtotal,
    tax: resolvedTax,
    total: resolvedTotal,
    items,
  };
}

export function parseReceiptText(rawText: string): ParsedReceiptDraft {
  const lines = rawText.split('\n').map(cleanOcrLine).filter(Boolean);
  return parseReceiptLines(lines);
}
