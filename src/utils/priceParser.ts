export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** PaddleOCR sometimes emits "$6 75" instead of "$6.75". */
function parseSpaceSeparatedCents(text: string): number | null {
  const match = text.match(/\$?\s*(\d{1,4})\s+(\d{2})(?!\d)/);
  if (!match) return null;
  return roundMoney(parseFloat(`${match[1]}.${match[2]}`));
}

export function parsePrice(text: string): number | null {
  const match = text.match(/\$?\s*(\d+\.\d{2})/);
  if (match) return roundMoney(parseFloat(match[1]));
  const spaced = parseSpaceSeparatedCents(text);
  if (spaced != null) return spaced;
  return parseLoosePrice(text);
}

function parseLoosePrice(text: string): number | null {
  const match = text.match(/\$?\s*(\d+)\.(\d{1,2})(?!\d)/);
  if (!match) return null;
  const cents = match[2].padEnd(2, '0').slice(0, 2);
  return roundMoney(parseFloat(`${match[1]}.${cents}`));
}

/** Tax lines like "T = TX TAX 8.25 on $555.00 $45.79" — tax is the smaller amount. */
export function parseTaxLineAmount(text: string): number | null {
  const prices = [...text.matchAll(/\$?\s*(\d+\.\d{2})/g)].map((match) =>
    roundMoney(parseFloat(match[1]))
  );
  if (prices.length === 0) return null;
  if (prices.length === 1) return prices[0] ?? null;
  if (/\bon\s+\$?\s*\d/i.test(text)) {
    return roundMoney(Math.min(...prices));
  }
  return prices[prices.length - 1] ?? null;
}

/** Prefer the rightmost price on a line (typical receipt item / total layout). */
export function parseLineEndPrice(text: string): number | null {
  const strictMatches = [...text.matchAll(/\$?\s*(\d+\.\d{2})/g)];
  if (strictMatches.length > 0) {
    return roundMoney(parseFloat(strictMatches[strictMatches.length - 1][1]));
  }

  const spacedEnd = text.match(/\$?\s*(\d{1,4})\s+(\d{2})\s*(?:H|_)?\s*$/i);
  if (spacedEnd) {
    return roundMoney(parseFloat(`${spacedEnd[1]}.${spacedEnd[2]}`));
  }

  const looseMatches = [...text.matchAll(/\$?\s*(\d+)\.(\d{1,2})(?!\d)/g)];
  if (looseMatches.length === 0) return parseSpaceSeparatedCents(text);
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
