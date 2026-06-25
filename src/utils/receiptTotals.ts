import type { ReceiptLineKind } from '@/src/models/types';
import { resolveReceiptLineKind } from '@/src/utils/receiptMerchandiseFilter';

type LineItem = { name: string; price: number; quantity: number; lineKind?: ReceiptLineKind };

export type ReceiptTotalsInput = {
  items?: LineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
};

export function computeItemsSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/** Sum merchandise + fee rows for subtotal reconciliation (excludes promo/OCR junk). */
export function computeSubtotalRelevantSum(items: LineItem[]): number {
  return computeItemsSubtotal(
    items.filter((item) => resolveReceiptLineKind(item) !== 'other')
  );
}

export function countLinesByKind(items: Array<{ name: string; lineKind?: ReceiptLineKind }>): {
  merchandise: number;
  fee: number;
  other: number;
  total: number;
} {
  let merchandise = 0;
  let fee = 0;
  let other = 0;
  for (const item of items) {
    const kind = resolveReceiptLineKind(item);
    if (kind === 'fee') fee++;
    else if (kind === 'other') other++;
    else merchandise++;
  }
  return { merchandise, fee, other, total: items.length };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export { roundMoney };

/** Resolve subtotal, tax, and total for display — receipt printed total wins when present. */
export function computeReceiptTotals(input: ReceiptTotalsInput): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const items = input.items ?? [];
  const itemsSum = computeItemsSubtotal(items);
  const parsedTax = input.tax ?? 0;
  const parsedSubtotal = input.subtotal;
  const receiptTotal = input.total ?? 0;
  const minItemPrice =
    items.length > 0 ? Math.min(...items.map((item) => roundMoney(item.price))) : 0;

  if (receiptTotal > 0) {
    const footerTripleLooksLikeTaxOnly =
      items.length > 0 &&
      parsedSubtotal != null &&
      parsedSubtotal > 0 &&
      parsedSubtotal < minItemPrice - 0.01 &&
      itemsSum > parsedSubtotal + 0.5;

    if (
      parsedSubtotal != null &&
      parsedSubtotal > 0 &&
      parsedTax != null &&
      parsedTax >= 0 &&
      Math.abs(parsedSubtotal + parsedTax - receiptTotal) <= 0.05 &&
      !footerTripleLooksLikeTaxOnly
    ) {
      return {
        subtotal: roundMoney(parsedSubtotal),
        tax: roundMoney(parsedTax),
        total: roundMoney(receiptTotal),
      };
    }

    // Line prices already include tax — sum of items matches printed total.
    if (Math.abs(itemsSum - receiptTotal) <= 0.1) {
      const tax =
        parsedTax > 0 && parsedTax < receiptTotal ? roundMoney(parsedTax) : 0;
      const subtotal =
        tax > 0 ? roundMoney(receiptTotal - tax) : roundMoney(itemsSum);
      return { subtotal, tax, total: roundMoney(receiptTotal) };
    }

    // Pre-tax item prices + tax = total.
    if (parsedTax > 0 && Math.abs(itemsSum + parsedTax - receiptTotal) <= 0.05) {
      return {
        subtotal: roundMoney(itemsSum),
        tax: roundMoney(parsedTax),
        total: roundMoney(receiptTotal),
      };
    }

    // Tax-inclusive (common on Canadian receipts): tax line is breakdown, not added again.
    if (
      parsedTax > 0 &&
      parsedSubtotal != null &&
      parsedSubtotal > 0 &&
      Math.abs(parsedSubtotal - receiptTotal) <= 0.01
    ) {
      const preTaxSubtotal = roundMoney(receiptTotal - parsedTax);
      const itemsCloserToPreTax =
        items.length > 0 &&
        Math.abs(itemsSum - preTaxSubtotal) + 0.5 < Math.abs(itemsSum - parsedSubtotal);
      if (itemsCloserToPreTax && preTaxSubtotal > 0) {
        return {
          subtotal: preTaxSubtotal,
          tax: roundMoney(parsedTax),
          total: roundMoney(receiptTotal),
        };
      }
      return {
        subtotal: roundMoney(parsedSubtotal),
        tax: roundMoney(parsedTax),
        total: roundMoney(receiptTotal),
      };
    }

    if (parsedTax > 0 && itemsSum + parsedTax > receiptTotal + 0.05) {
      const tax = roundMoney(parsedTax);
      const subtotal = roundMoney(receiptTotal - tax);
      if (subtotal > 0) {
        return { subtotal, tax, total: roundMoney(receiptTotal) };
      }
      return {
        subtotal: roundMoney(receiptTotal),
        tax: 0,
        total: roundMoney(receiptTotal),
      };
    }

    const tax =
      parsedTax > 0 && parsedTax < receiptTotal ? roundMoney(parsedTax) : 0;
    const subtotal =
      parsedSubtotal != null && parsedSubtotal > 0
        ? roundMoney(parsedSubtotal)
        : tax > 0
          ? roundMoney(receiptTotal - tax)
          : roundMoney(itemsSum || receiptTotal);
    return { subtotal, tax, total: roundMoney(receiptTotal) };
  }

  const subtotal = parsedSubtotal ?? itemsSum;
  const tax = parsedTax;
  return {
    subtotal: roundMoney(subtotal),
    tax: roundMoney(tax),
    total: roundMoney(subtotal + tax),
  };
}

/** Derive subtotal and total from line items + tax before persisting. */
export function normalizeReceiptTotalsForSave(
  items: LineItem[],
  tax?: number,
  total?: number,
  subtotal?: number
): { subtotal: number; tax: number; total: number } {
  return computeReceiptTotals({ items, tax, total, subtotal });
}

/** Single total for list cards, analytics, and aggregations. */
export function getReceiptDisplayTotal(input: ReceiptTotalsInput): number {
  return computeReceiptTotals(input).total;
}

/** Apply computed subtotal/tax/total onto a receipt (optionally with preloaded items). */
export function applyReceiptTotals<T extends ReceiptTotalsInput>(
  receipt: T,
  items?: LineItem[]
): T & { subtotal: number; tax: number; total: number } {
  const resolvedItems = items ?? receipt.items ?? [];
  const totals = computeReceiptTotals({
    items: resolvedItems,
    subtotal: receipt.subtotal,
    tax: receipt.tax,
    total: receipt.total,
  });
  return { ...receipt, ...totals };
}
