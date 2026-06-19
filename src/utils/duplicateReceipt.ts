export const DUPLICATE_RECEIPT_TOLERANCE = 0.01;

export function isDuplicateReceiptTotal(a: number, b: number): boolean {
  return Math.abs(a - b) <= DUPLICATE_RECEIPT_TOLERANCE;
}

export function normalizeStoreForDuplicate(name: string): string {
  return name.trim().toLowerCase();
}
