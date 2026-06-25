import type { ParsedReceiptDraft, ReceiptLineKind } from '@/src/models/types';
import { HIDDEN_ITEM_NAME } from '@/src/utils/receiptDraftNormalizer';
import { cleanReceiptItemNames } from '@/src/utils/receiptDraftNormalizer';
import {
  classifyReceiptLineKind,
  isPaymentLineName,
  looksLikePromoFooterJunk,
} from '@/src/utils/receiptMerchandiseFilter';
import { applyStoreLocationToDraft, parseStoreLocationFromOcrText } from '@/src/utils/storeLocationParser';
import { normalizeUnitLabel, parseUnitPriceFromLine } from '@/src/utils/unitPriceParser';
import { computeItemsSubtotal, computeReceiptTotals } from '@/src/utils/receiptTotals';
import { guessDateFromText, todayISO } from '@/src/utils/dateParser';
import { parseLineEndPrice, parsePrice, parseTaxLineAmount, roundMoney } from '@/src/utils/priceParser';
import { cleanOcrLine } from '@/src/utils/textCleaner';
import {
  isPlausibleItemPrice,
  looksLikeReceiptHeaderJunk,
} from '@/src/utils/receiptHeaderFilter';

const SUBTOTAL_KEYWORDS = ['subtotal', 'sub total', 'sub-total', 'merchandise'];
const TAX_KEYWORDS = ['tax', 'sales tax', 'hst', 'gst', 'vat'];
const TOTAL_KEYWORDS = ['total', 'amount due', 'balance due', 'grand total', 'total due'];

const CATEGORY_HEADER_RE =
  /^(APPAREL|HOME|GROCERY|FOOD|HEALTH|BEAUTY|TOYS|SPORTS|ELECTRONICS|AUTOMOTIVE|OFFICE|PET|SCHOOL|KITCHEN|FURNITURE|OUTDOOR|PATIO|SEASONAL)$/i;

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
  /\bcard ending\b/i,
  /\binterac\b/i,
  /\bvisa debit\b/i,
  /\bmastercard debit\b/i,
  /^paid with\b/i,
  /^approved\b/i,
  /^change due\b/i,
  /^only\s+\$/i,
  /\bdebit total payment\b/i,
];

function isSummaryKeyword(lower: string, keywords: string[]): boolean {
  return keywords.some((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
  });
}

function isSubtotalLine(lower: string): boolean {
  return isSummaryKeyword(lower, SUBTOTAL_KEYWORDS);
}

function isTaxLine(lower: string): boolean {
  if (isSubtotalLine(lower)) return false;
  return isSummaryKeyword(lower, TAX_KEYWORDS);
}

function isPaymentTotalLine(lower: string): boolean {
  return (
    /\b(debit|credit|cash|visa|mastercard|payment)\b/i.test(lower) && /\btotal\b/i.test(lower)
  );
}

function isTotalLine(lower: string): boolean {
  if (isSubtotalLine(lower)) return false;
  if (isTaxLine(lower)) return false;
  if (isPaymentTotalLine(lower)) return false;
  if (/^otal\b/.test(lower)) return true;
  if (/\btotal\b/.test(lower)) return true;
  return TOTAL_KEYWORDS.filter((k) => k !== 'total').some((k) => lower.includes(k));
}

function isCategoryHeader(line: string): boolean {
  return CATEGORY_HEADER_RE.test(line.trim());
}

/** Target receipts mark taxable items with a standalone "T" between name and price. */
function isTaxIndicatorLine(line: string): boolean {
  return /^T\s*$/i.test(line.trim());
}

function cleanItemName(name: string): string {
  return name
    .replace(/\s+H\s*$/i, '')
    .replace(/\s+_\s*$/g, '')
    .replace(/^\.+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
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
  if (/^\d+\s+\w/.test(line) && parsePrice(line) == null) {
    const leadingDigits = line.match(/^(\d+)/)?.[1] ?? '';
    // Target/Walmart item lines start with long SKU codes, not street numbers.
    if (leadingDigits.length >= 9) return false;
    return true;
  }
  return false;
}

function scoreStoreCandidate(line: string): number {
  if (isCategoryHeader(line)) return -1;
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
  for (const line of lines) {
    for (const store of KNOWN_STORES) {
      if (store.pattern.test(line)) return store.name;
    }
  }

  const headerLines = lines.slice(0, 12);
  let bestName = 'Unknown Store';
  let bestScore = 0;

  for (const line of headerLines) {
    const score = scoreStoreCandidate(line);
    if (score > bestScore) {
      bestScore = score;
      bestName = line;
    }
  }

  return bestName;
}

function stripLineEndPrice(line: string): string {
  return line
    .replace(/\$?\s*\d+\.\d{2}\s*(?:H|_)?\s*$/i, '')
    .replace(/\$?\s*\d+\.\d{1,2}\s*(?:H|_)?\s*$/i, '')
    .replace(/\$?\s*\d{1,4}\s+\d{2}\s*(?:H|_)?\s*$/i, '')
    .trim();
}

function attachUnitFromLine(
  line: string,
  item: ParsedReceiptDraft['items'][0]
): ParsedReceiptDraft['items'][0] {
  const parsed = parseUnitPriceFromLine(line);
  if (parsed.unitPrice && parsed.unit) {
    return { ...item, unitPrice: parsed.unitPrice, unit: parsed.unit };
  }
  return item;
}

function parseItemLine(line: string): ParsedReceiptDraft['items'][0] | null {
  const qtyAtPrice = line.match(
    /^(.+?)\s+(\d+)\s*[@xX]\s*\$?\s*(\d+\.\d{1,2})\s*(?:H|_)?\s*$/i
  );
  if (qtyAtPrice) {
    const quantity = parseInt(qtyAtPrice[2], 10);
    const unitPrice = parseLineEndPrice(qtyAtPrice[3]) ?? 0;
    const name = qtyAtPrice[1].trim();
    if (name.length > 0 && quantity > 0 && unitPrice > 0) {
      return attachUnitFromLine(line, {
        name,
        price: roundMoney(unitPrice * quantity),
        quantity: 1,
        unitPrice,
        unit: 'ea',
      });
    }
  }

  const qtySuffix = line.match(/^(.+?)\s+QTY\s+(\d+)\s+\$?\s*(\d+\.\d{1,2})\s*(?:H|_)?\s*$/i);
  if (qtySuffix) {
    const quantity = parseInt(qtySuffix[2], 10);
    const linePrice = parseLineEndPrice(qtySuffix[3]) ?? 0;
    const name = qtySuffix[1].trim();
    if (name.length > 0 && quantity > 0 && linePrice > 0) {
      return attachUnitFromLine(line, { name, price: linePrice, quantity });
    }
  }

  const price = parseLineEndPrice(line);
  if (price == null) return null;

  const namePart = cleanItemName(stripLineEndPrice(line));
  if (namePart.length < 2) {
    return attachUnitFromLine(line, { name: HIDDEN_ITEM_NAME, price, quantity: 1 });
  }
  if (/^\d+$/.test(namePart.replace(/\s/g, ''))) return null;
  if (/^otal$/i.test(namePart)) return null;
  if (isSummaryKeyword(namePart.toLowerCase(), [...SUBTOTAL_KEYWORDS, ...TAX_KEYWORDS, ...TOTAL_KEYWORDS])) {
    return null;
  }

  return attachUnitFromLine(line, { name: namePart, price, quantity: 1 });
}

function hasLinePrice(line: string): boolean {
  return parseLineEndPrice(line) != null;
}

function isPriceOnlyLine(line: string): boolean {
  if (!hasLinePrice(line)) return false;
  const namePart = cleanItemName(stripLineEndPrice(line));
  if (namePart.length < 2) return true;
  if (/^\.+$/.test(namePart.replace(/\s/g, ''))) return true;
  return false;
}

function isKnownStoreLabel(line: string): boolean {
  const trimmed = line.trim();
  return KNOWN_STORES.some((store) => store.pattern.test(trimmed));
}

function looksLikeBarcodeOrHeader(line: string): boolean {
  return looksLikeReceiptHeaderJunk(line);
}

function isItemNameContinuation(line: string): boolean {
  const trimmed = line.trim();
  return /^QTY\s+\d+/i.test(trimmed) || /^@\s*\d/i.test(trimmed);
}

function looksLikePendingItemName(line: string): boolean {
  if (line.length < 2) return false;
  if (hasLinePrice(line)) return false;
  if (shouldSkipLine(line)) return false;
  if (guessDateFromText(line)) return false;
  if (isAddressOrPhoneLine(line)) return false;

  const lower = line.toLowerCase();
  if (isSubtotalLine(lower) || isTaxLine(lower) || isTotalLine(lower)) return false;
  if (/^\d+$/.test(line.replace(/\s/g, ''))) return false;

  const alphaChars = (line.match(/[a-zA-Z]/g) ?? []).length;
  return alphaChars >= 2;
}

function parseWithPendingName(
  pendingName: string | null,
  line: string
): { item: { name: string; price: number; quantity: number } | null; usedPending: boolean } {
  if (!pendingName) {
    if (isPriceOnlyLine(line)) {
      const price = parseLineEndPrice(line);
      if (price != null) {
        return { item: { name: HIDDEN_ITEM_NAME, price, quantity: 1 }, usedPending: false };
      }
    }
    return { item: parseItemLine(line), usedPending: false };
  }

  if (isPriceOnlyLine(line)) {
    const combined = parseItemLine(`${pendingName} ${line}`);
    if (combined) {
      return { item: combined, usedPending: true };
    }
  }

  const direct = parseItemLine(line);
  if (direct && (direct.name.length >= 3 || !isPriceOnlyLine(line))) {
    return { item: direct, usedPending: false };
  }

  const combined = parseItemLine(`${pendingName} ${line}`);
  if (combined) {
    return { item: combined, usedPending: true };
  }

  return { item: direct, usedPending: false };
}

export function parseReceiptLines(lines: string[]): ParsedReceiptDraft {
  const storeName = detectStoreName(lines);
  let date = todayISO();
  let subtotal: number | undefined;
  let tax: number | undefined;
  let total = 0;
  const items: ParsedReceiptDraft['items'] = [];
  let pendingItemName: string | null = null;
  let pendingPriceOnly: number | null = null;
  let paymentBlock = false;
  let pendingClassifiedLine: { name: string; lineKind: ReceiptLineKind } | null = null;
  let footerPhase: 'none' | 'after_subtotal' | 'after_tax' | 'after_total' = 'none';

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (looksLikeReceiptHeaderJunk(line)) {
      pendingItemName = null;
      pendingPriceOnly = null;
      continue;
    }

    if (shouldSkipLine(line)) {
      pendingItemName = null;
      continue;
    }

    if (paymentBlock && pendingClassifiedLine) {
      if (/^QTY\s+\d+/i.test(line.trim())) {
        pendingClassifiedLine = {
          name: `${pendingClassifiedLine.name} ${line.trim()}`,
          lineKind: pendingClassifiedLine.lineKind,
        };
        continue;
      }
      if (isPriceOnlyLine(line)) {
        const classifiedPrice = parseLineEndPrice(line);
        if (classifiedPrice != null && isPlausibleItemPrice(classifiedPrice, { subtotal })) {
          items.push({
            name: pendingClassifiedLine.name,
            price: classifiedPrice,
            quantity: 1,
            lineKind: pendingClassifiedLine.lineKind,
          });
        }
        pendingClassifiedLine = null;
        paymentBlock = false;
        continue;
      }
    }

    if (isPaymentLineName(line) || looksLikePromoFooterJunk(line)) {
      const classifiedKind = classifyReceiptLineKind(line);
      // DeepRead often emits promo footer junk on one line (e.g. "BREAD ONLY $2.99 H").
      if (looksLikePromoFooterJunk(line) && hasLinePrice(line)) {
        const inlineItem = parseItemLine(line);
        if (inlineItem && isPlausibleItemPrice(inlineItem.price, { subtotal })) {
          items.push({
            name: cleanItemName(inlineItem.name),
            price: inlineItem.price,
            quantity: inlineItem.quantity,
            lineKind: classifiedKind,
          });
          pendingClassifiedLine = null;
          paymentBlock = false;
          pendingItemName = null;
          pendingPriceOnly = null;
          continue;
        }
      }
      pendingClassifiedLine = {
        name: cleanItemName(line),
        lineKind: classifiedKind,
      };
      paymentBlock = true;
      pendingItemName = null;
      pendingPriceOnly = null;
      continue;
    }

    if (paymentBlock) {
      if (/^QTY\s+\d+/i.test(line.trim())) continue;
      if (isPriceOnlyLine(line)) {
        paymentBlock = false;
        pendingClassifiedLine = null;
        continue;
      }
      paymentBlock = false;
      pendingClassifiedLine = null;
    }

    if (isCategoryHeader(line)) {
      pendingItemName = null;
      continue;
    }

    if (isTaxIndicatorLine(line)) {
      if (pendingItemName) {
        pendingItemName = `${pendingItemName} T`;
      }
      continue;
    }

    const guessed = guessDateFromText(line);
    if (guessed) {
      date = guessed;
      pendingItemName = null;
      continue;
    }

    if (isSubtotalLine(lower)) {
      subtotal = parseLineEndPrice(line) ?? parsePrice(line) ?? subtotal;
      pendingItemName = null;
      pendingPriceOnly = null;
      footerPhase = 'after_subtotal';
      continue;
    }
    if (isTaxLine(lower)) {
      const inlineTax = parseTaxLineAmount(line);
      // Rate lines like "T = TX TAX 8.25000 on $555.00" — amount is on the next line.
      if (inlineTax != null && (!/\bon\s+\$/i.test(line) || inlineTax >= 20)) {
        tax = inlineTax;
      }
      pendingItemName = null;
      pendingPriceOnly = null;
      footerPhase = 'after_tax';
      continue;
    }
    if (isTotalLine(lower)) {
      const candidateTotal = parseLineEndPrice(line) ?? parsePrice(line);
      if (
        footerPhase === 'after_total' &&
        total > 0 &&
        candidateTotal != null &&
        candidateTotal < total * 0.5
      ) {
        pendingItemName = null;
        continue;
      }
      total = candidateTotal ?? total;
      pendingItemName = null;
      pendingPriceOnly = null;
      footerPhase = 'after_total';
      continue;
    }

    if (footerPhase !== 'none' && isPriceOnlyLine(line)) {
      const footerPrice = parseLineEndPrice(line);
      if (footerPrice != null) {
        if (footerPhase === 'after_subtotal' && (subtotal == null || subtotal === 0)) {
          subtotal = footerPrice;
          continue;
        }
        if (footerPhase === 'after_tax' && (tax == null || tax === 0 || tax < 20)) {
          tax = footerPrice;
          continue;
        }
        if (footerPhase === 'after_total' && (total == null || total === 0)) {
          total = footerPrice;
          continue;
        }
      }
      continue;
    }

    // Some OCR streams emit "price line" then "name line" for each item.
    // Pair those lines before falling back to hidden-name handling.
    if (pendingPriceOnly != null && !hasLinePrice(line) && looksLikePendingItemName(line)) {
      if (isKnownStoreLabel(line)) {
        if (footerPhase === 'after_total' && (total == null || total === 0)) {
          total = pendingPriceOnly;
        }
        pendingPriceOnly = null;
        pendingItemName = null;
        continue;
      }

      const named = cleanItemName(line);
      if (named.length >= 2) {
        items.push({ name: named, price: pendingPriceOnly, quantity: 1 });
        pendingPriceOnly = null;
        pendingItemName = null;
        continue;
      }
    }

    // Canadian / Walmart OCR often emits "name line" then "price line" for each item.
    if (pendingItemName && isPriceOnlyLine(line)) {
      if (looksLikeBarcodeOrHeader(pendingItemName)) {
        const priceOnly = parseLineEndPrice(line);
        if (priceOnly != null) {
          if (pendingPriceOnly != null) {
            items.push({ name: HIDDEN_ITEM_NAME, price: pendingPriceOnly, quantity: 1 });
          }
          pendingPriceOnly = priceOnly;
          pendingItemName = null;
          continue;
        }
      }

      const combined = parseItemLine(`${pendingItemName} ${line}`);
      if (combined) {
        items.push(combined);
        pendingItemName = null;
        pendingPriceOnly = null;
        continue;
      }
    }

    if (isPriceOnlyLine(line)) {
      const priceOnly = parseLineEndPrice(line);
      if (priceOnly != null) {
        if (pendingPriceOnly != null) {
          items.push({ name: HIDDEN_ITEM_NAME, price: pendingPriceOnly, quantity: 1 });
        }
        pendingPriceOnly = priceOnly;
        pendingItemName = null;
        continue;
      }
    } else if (pendingPriceOnly != null && hasLinePrice(line)) {
      // Previous price-only line never got a name; keep it as hidden.
      items.push({ name: HIDDEN_ITEM_NAME, price: pendingPriceOnly, quantity: 1 });
      pendingPriceOnly = null;
    }

    const { item, usedPending } = parseWithPendingName(pendingItemName, line);
    if (item) {
      if (!isPlausibleItemPrice(item.price, { subtotal })) {
        pendingItemName = usedPending ? null : pendingItemName;
        if (!usedPending) pendingItemName = null;
        continue;
      }
      items.push(item);
      pendingItemName = usedPending ? null : pendingItemName;
      if (!usedPending) pendingItemName = null;
      continue;
    }

    if (looksLikePendingItemName(line)) {
      if (pendingItemName && !isItemNameContinuation(line)) {
        // Orphan name (OCR missed its price) — start the next product line fresh.
        pendingItemName = line;
      } else {
        pendingItemName = pendingItemName ? `${pendingItemName} ${line}` : line;
      }
    } else {
      pendingItemName = null;
    }
  }

  if (pendingPriceOnly != null) {
    if (footerPhase === 'after_total' && (total == null || total === 0)) {
      total = pendingPriceOnly;
    } else if (footerPhase === 'none') {
      items.push({ name: HIDDEN_ITEM_NAME, price: pendingPriceOnly, quantity: 1 });
    }
  }

  if (subtotal == null && items.length > 0) {
    subtotal = computeItemsSubtotal(items);
  }

  const normalizedItems = cleanReceiptItemNames(items);

  const { subtotal: resolvedSubtotal, tax: resolvedTax, total: resolvedTotal } = computeReceiptTotals({
    items: normalizedItems,
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
    items: normalizedItems,
  };
}

export function parseReceiptText(rawText: string): ParsedReceiptDraft {
  const lines = rawText.split('\n').map(cleanOcrLine).filter(Boolean);
  const draft = parseReceiptLines(lines);
  const location = parseStoreLocationFromOcrText(rawText);
  return applyStoreLocationToDraft(draft, location);
}
