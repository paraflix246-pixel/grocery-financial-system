export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDisplayDate(isoDate: string): string {
  const normalized = normalizeReceiptDate(isoDate);
  const date = new Date(normalized + 'T12:00:00');
  if (Number.isNaN(date.getTime())) {
    return formatDisplayDate(todayISO());
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Pantry "Added on" from a receipt: transaction date, else scan date, else today. */
export function resolvePantryAddedDateFromReceipt(receipt: {
  date?: string;
  createdAt?: string;
}): string {
  const scanDate = receipt.createdAt?.trim()
    ? normalizeReceiptDate(receipt.createdAt.split('T')[0])
    : undefined;
  return normalizeReceiptDate(receipt.date, scanDate);
}

/** Normalize receipt header dates to YYYY-MM-DD. */
export function normalizeReceiptDate(raw: string | undefined, fallback?: string): string {
  if (!raw?.trim()) return fallback ?? todayISO();

  const trimmed = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const year = parseInt(trimmed.slice(0, 4), 10);
    const month = parseInt(trimmed.slice(5, 7), 10);
    const day = parseInt(trimmed.slice(8, 10), 10);
    if (year >= 2015 && year <= 2035 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const probe = new Date(`${trimmed}T12:00:00`);
      if (!Number.isNaN(probe.getTime())) return trimmed;
    }
  }

  const guessed = guessDateFromText(trimmed);
  if (guessed) return guessed;

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const iso = new Date(parsed).toISOString().split('T')[0];
    const year = parseInt(iso.slice(0, 4), 10);
    if (year >= 2015 && year <= 2035) return iso;
  }

  return fallback ?? todayISO();
}

/** Prefer OCR header date when AI returns an implausible year (e.g. 2008 for a 2026 receipt). */
export function resolveReceiptDate(
  aiDate: string | undefined,
  ocrText?: string,
  _storeName?: string
): string {
  const fromOcr = ocrText ? guessDateFromText(ocrText) : null;
  const normalizedAi = aiDate ? normalizeReceiptDate(aiDate) : null;
  const validOcr = fromOcr && isValidISODate(fromOcr) ? fromOcr : null;
  const validAi = normalizedAi && isValidISODate(normalizedAi) ? normalizedAi : null;

  if (validOcr && validAi) {
    const ocrYear = parseInt(validOcr.slice(0, 4), 10);
    const aiYear = parseInt(validAi.slice(0, 4), 10);
    if (aiYear < 2015 && ocrYear >= 2020) return validOcr;
    // OCR header date wins when AI year is stale (e.g. 03/26/2023 misread from 23/03/2026).
    if (ocrYear >= 2020 && ocrYear <= 2035 && ocrYear > aiYear) return validOcr;
    if (ocrYear >= 2020 && ocrYear <= 2035) return validOcr;
  }

  return validOcr ?? validAi ?? todayISO();
}

export function startOfWeekISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function endOfWeekISO(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/** Parse the first slash/dash date in text to YYYY-MM-DD (handles DD/MM when day > 12). */
export function guessDateFromText(text: string): string | null {
  const match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!match) return null;
  return parseSlashDateParts(match[1], match[2], match[3]);
}

function parseSlashDateParts(a: string, b: string, y: string): string | null {
  const first = parseInt(a, 10);
  const second = parseInt(b, 10);
  const year = parseInt(y.length === 2 ? `20${y}` : y, 10);
  if (!Number.isFinite(first) || !Number.isFinite(second) || !Number.isFinite(year)) return null;
  if (year < 2015 || year > 2035) return null;

  let month: number;
  let day: number;

  if (first > 12 && second <= 12) {
    day = first;
    month = second;
  } else if (second > 12 && first <= 12) {
    month = first;
    day = second;
  } else if (first > 12 && second > 12) {
    return null;
  } else {
    // Ambiguous MM/DD vs DD/MM — default US MM/DD when both <= 12.
    month = first;
    day = second;
  }

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isValidISODate(iso) ? iso : null;
}

export function isValidISODate(raw: string): boolean {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const year = parseInt(trimmed.slice(0, 4), 10);
  const month = parseInt(trimmed.slice(5, 7), 10);
  const day = parseInt(trimmed.slice(8, 10), 10);
  if (year < 2015 || year > 2035 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(`${trimmed}T12:00:00`);
  return !Number.isNaN(probe.getTime());
}

/** Parse user date input; returns null when empty or invalid (no fallback). */
export function parseISODateInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!isValidISODate(trimmed)) return null;
  return trimmed;
}

export function addDaysToISO(isoDate: string, days: number): string {
  const base = new Date(`${normalizeReceiptDate(isoDate)}T12:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Whole days from `fromIso` to `toIso` (negative if expiry is before added date). */
export function daysBetweenISO(fromIso: string, toIso: string): number {
  const from = new Date(`${normalizeReceiptDate(fromIso)}T12:00:00`);
  const to = new Date(`${normalizeReceiptDate(toIso)}T12:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}
