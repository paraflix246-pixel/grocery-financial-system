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

/** Resolve subtotal, tax, and total for display — fills in missing or inconsistent values. */
export function computeReceiptTotals(input: ReceiptTotalsInput): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const items = input.items ?? [];
  const itemsSubtotal = computeItemsSubtotal(items);
  const subtotal = input.subtotal ?? itemsSubtotal;

  let tax = input.tax;
  if (tax == null && input.total != null && input.total > subtotal) {
    tax = input.total - subtotal;
  }
  tax = tax ?? 0;

  const computedTotal = subtotal + tax;
  const storedTotal = input.total ?? 0;
  const total =
    storedTotal <= 0 || Math.abs(storedTotal - computedTotal) > 0.01 ? computedTotal : storedTotal;

  return { subtotal, tax, total };
}

/** Derive subtotal and total from line items + tax before persisting. */
export function normalizeReceiptTotalsForSave(
  items: LineItem[],
  tax?: number
): { subtotal: number; tax: number; total: number } {
  const subtotal = computeItemsSubtotal(items);
  const normalizedTax = tax ?? 0;
  return { subtotal, tax: normalizedTax, total: subtotal + normalizedTax };
}
