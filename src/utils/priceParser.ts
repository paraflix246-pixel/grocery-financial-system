export function parsePrice(text: string): number | null {
  const match = text.match(/\$?\s*(\d+\.\d{2})/);
  if (!match) return null;
  return parseFloat(match[1]);
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function sumPlannedTotal(
  items: Array<{ expectedPrice: number; quantity: number }>
): number {
  return items.reduce((sum, item) => sum + item.expectedPrice * item.quantity, 0);
}
