import {
  filterPlausibleItemPrices,
  isPlausibleItemPrice,
  looksLikeReceiptHeaderJunk,
} from '@/src/utils/receiptHeaderFilter';
import {
  isPaymentLineName,
  looksLikePromoFooterJunk,
} from '@/src/utils/receiptMerchandiseFilter';
import { roundMoney, parseLineEndPrice } from '@/src/utils/priceParser';

const SUBTOTAL_PATTERN = /\b(sub\s*total|subtotal|merchandise)\b/i;
const TAX_PATTERN = /\b(tax|hst|gst|vat|sales tax)\b/i;
const TOTAL_PATTERN = /\b(total|amount due|balance due|grand total|total due)\b/i;

type KnownTotals = {
  subtotal?: number;
  tax?: number;
  total?: number;
};

function isFooterPrice(price: number, known: KnownTotals): boolean {
  if (known.subtotal != null && Math.abs(price - known.subtotal) <= 0.01) return true;
  if (known.tax != null && Math.abs(price - known.tax) <= 0.01) return true;
  if (known.total != null && Math.abs(price - known.total) <= 0.01) return true;
  return false;
}

function isSummaryLine(line: string): boolean {
  const lower = line.toLowerCase();
  return SUBTOTAL_PATTERN.test(lower) || TAX_PATTERN.test(lower) || TOTAL_PATTERN.test(lower);
}

/** Canadian receipts print SUBTOTAL = TOTAL with HST as an included breakdown. */
function isCanadianTaxInclusiveFooter(known: KnownTotals): boolean {
  return (
    known.subtotal != null &&
    known.subtotal > 0 &&
    known.total != null &&
    known.total > 0 &&
    known.tax != null &&
    known.tax > 0 &&
    Math.abs(known.subtotal - known.total) <= 0.01
  );
}

/** Collect item prices from OCR lines; stops at subtotal/footer and excludes total lines. */
export function extractItemPricesFromOcrText(ocrText: string, known: KnownTotals = {}): number[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const prices: number[] = [];
  let runningSum = 0;
  let seenItemLikeLine = false;
  let paymentBlock = false;
  const subtotalTarget = known.subtotal ?? 0;
  const canadianHst = isCanadianTaxInclusiveFooter(known);

  for (const line of lines) {
    if (SUBTOTAL_PATTERN.test(line)) break;
    if (looksLikeReceiptHeaderJunk(line)) continue;

    if (isPaymentLineName(line) || looksLikePromoFooterJunk(line)) {
      paymentBlock = true;
      continue;
    }

    if (/^QTY\s+\d+/i.test(line)) {
      if (paymentBlock) continue;
    }

    const price = parseLineEndPrice(line);
    if (price == null) {
      if (paymentBlock && !/^QTY\s+\d+/i.test(line)) {
        paymentBlock = false;
      }
      continue;
    }

    if (paymentBlock) {
      paymentBlock = false;
      continue;
    }

    const inlineName = line
      .replace(/\$?\s*\d+\.\d{2}\s*(?:H|_)?\s*$/i, '')
      .replace(/\$?\s*\d{1,4}\s+\d{2}\s*(?:H|_)?\s*$/i, '')
      .trim();
    if (isPaymentLineName(inlineName) || looksLikePromoFooterJunk(inlineName)) continue;

    if (!isPlausibleItemPrice(price, known)) continue;
    if (isFooterPrice(price, known)) break;
    if (isSummaryLine(line)) break;

    const alphaChars = (line.match(/[a-zA-Z]/g) ?? []).length;
    const digitsOnly = line.replace(/[^0-9]/g, '');
    if (!seenItemLikeLine && alphaChars < 2 && digitsOnly.length > 8) continue;

    if (TOTAL_PATTERN.test(line) && !seenItemLikeLine) continue;

    prices.push(price);
    runningSum = roundMoney(runningSum + price);
    if (alphaChars >= 2 || /QTY|@/i.test(line)) {
      seenItemLikeLine = true;
    }

    if (!canadianHst && subtotalTarget > 0 && runningSum >= subtotalTarget - 0.05) break;
  }

  const plausible = filterPlausibleItemPrices(prices, known);
  return subtotalTarget > 0 ? trimPricesToSubtotal(plausible, subtotalTarget) : plausible;
}

/** Keep prices only until they sum to the printed subtotal. */
export function trimPricesToSubtotal(prices: number[], subtotal: number): number[] {
  if (subtotal <= 0 || prices.length === 0) return prices;

  const result: number[] = [];
  let sum = 0;

  for (const price of prices) {
    if (sum + price > subtotal + 0.05) break;
    result.push(price);
    sum = roundMoney(sum + price);
    if (Math.abs(sum - subtotal) <= 0.05) break;
  }

  return result;
}
