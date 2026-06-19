type LineItem = { price: number; quantity: number };

export type ReceiptTotalsInput = {
  items?: LineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
};

export function computeItemsSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

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

  if (receiptTotal > 0) {
    // Line prices already include tax — sum of items matches printed total.
    if (Math.abs(itemsSum - receiptTotal) <= 0.1) {
      const tax =
        parsedTax > 0 && parsedTax < receiptTotal ? roundMoney(parsedTax) : 0;
      const subtotal =
        tax > 0 ? roundMoney(receiptTotal - tax) : roundMoney(itemsSum);
      return { subtotal, tax, total: roundMoney(receiptTotal) };
    }

    // Classic receipt: subtotal + tax = total.
    if (
      parsedSubtotal != null &&
      parsedSubtotal > 0 &&
      Math.abs(parsedSubtotal + parsedTax - receiptTotal) <= 0.05
    ) {
      return {
        subtotal: roundMoney(parsedSubtotal),
        tax: roundMoney(parsedTax),
        total: roundMoney(receiptTotal),
      };
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
