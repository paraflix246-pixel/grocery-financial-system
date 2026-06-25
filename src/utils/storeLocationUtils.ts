import type { StoreLocation } from '@/src/models/types';
import {
  formatStoreLocationForCopy,
  normalizeStoreLocation,
} from '@/src/utils/storeLocationParser';

export function hasStoreLocation(location: StoreLocation): boolean {
  return Boolean(
    hasReceiptPrintedAddress(location) ||
      location.storeRegion?.trim()
  );
}

/** True when the receipt header likely printed street, city, or ZIP — not state alone. */
export function hasReceiptPrintedAddress(location: StoreLocation): boolean {
  const normalized = normalizeStoreLocation(location);
  if (normalized.storeAddress?.trim()) return true;
  if (normalized.storePostalCode?.trim()) return true;
  const city = normalized.storeCity?.trim();
  const region = normalized.storeRegion?.trim().toUpperCase();
  if (city && city.toUpperCase() !== region) return true;
  return false;
}

export function isLocationIncomplete(location: StoreLocation): boolean {
  return !location.storeRegion?.trim();
}
