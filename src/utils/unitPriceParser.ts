import { parsePrice, roundMoney } from '@/src/utils/priceParser';

const UNIT_PRICE_RE =
  /@?\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:\/)?\s*(lb|lbs|pound|pounds|oz|ounce|ounces|ea|each|l|lt|liter|litre|gal|gallon|gallons|kg|g|unit|units)\b/i;

const LEADING_UNIT_RE =
  /\b(lb|lbs|oz|ea|each|l|gal|kg|g)\b\s*@?\s*\$?\s*(\d+(?:\.\d{1,2})?)/i;

const UNIT_ALIASES: Record<string, string> = {
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  ea: 'ea',
  each: 'ea',
  unit: 'ea',
  units: 'ea',
  l: 'L',
  lt: 'L',
  liter: 'L',
  litre: 'L',
  gal: 'gal',
  gallon: 'gal',
  gallons: 'gal',
  kg: 'kg',
  g: 'g',
};

export function normalizeUnitLabel(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  return UNIT_ALIASES[raw.trim().toLowerCase()] ?? raw.trim().toLowerCase();
}

export function parseUnitPriceFromLine(line: string): { unitPrice?: number; unit?: string } {
  const trimmed = line.trim();
  if (!trimmed) return {};

  const match = trimmed.match(UNIT_PRICE_RE);
  if (match) {
    const unitPrice = parsePrice(match[1]);
    const unit = normalizeUnitLabel(match[2]);
    if (unitPrice != null && unitPrice > 0 && unit) {
      return { unitPrice: roundMoney(unitPrice), unit };
    }
  }

  const leading = trimmed.match(LEADING_UNIT_RE);
  if (leading) {
    const unit = normalizeUnitLabel(leading[1]);
    const unitPrice = parsePrice(leading[2]);
    if (unitPrice != null && unitPrice > 0 && unit) {
      return { unitPrice: roundMoney(unitPrice), unit };
    }
  }

  return {};
}

export function formatUnitPriceLabel(unitPrice?: number, unit?: string): string | null {
  if (unitPrice == null || unitPrice <= 0 || !unit?.trim()) return null;
  return `$${unitPrice.toFixed(2)}/${unit}`;
}
