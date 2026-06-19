export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function parsePrice(text: string): number | null {
  const match = text.match(/\$?\s*(\d+\.\d{2})/);
  if (!match) return parseLoosePrice(text);
  return roundMoney(parseFloat(match[1]));
}

function parseLoosePrice(text: string): number | null {
  const match = text.match(/\$?\s*(\d+)\.(\d{1,2})(?!\d)/);
  if (!match) return null;
  const cents = match[2].padEnd(2, '0').slice(0, 2);
  return roundMoney(parseFloat(`${match[1]}.${cents}`));
}

/** Prefer the rightmost price on a line (typical receipt item / total layout). */
export function parseLineEndPrice(text: string): number | null {
  const strictMatches = [...text.matchAll(/\$?\s*(\d+\.\d{2})/g)];
  if (strictMatches.length > 0) {
    return roundMoney(parseFloat(strictMatches[strictMatches.length - 1][1]));
  }

  const looseMatches = [...text.matchAll(/\$?\s*(\d+)\.(\d{1,2})(?!\d)/g)];
  if (looseMatches.length === 0) return null;
  const last = looseMatches[looseMatches.length - 1];
  const cents = last[2].padEnd(2, '0').slice(0, 2);
  return roundMoney(parseFloat(`${last[1]}.${cents}`));
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function sumPlannedTotal(
  items: Array<{ expectedPrice: number; quantity: number }>
): number {
  return items.reduce((sum, item) => sum + item.expectedPrice * item.quantity, 0);
}
