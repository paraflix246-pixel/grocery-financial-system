import { useCallback, useEffect, useRef, useState } from 'react';

import type { StoreLocation } from '@/src/models/types';
import {
  isGeocodeSearchAvailable,
  searchGeocodeAddresses,
} from '@/src/services/geocode/geocodeClient';
import {
  formatStoreLocationForCopy,
  looksLikeAddressFieldJunk,
} from '@/src/utils/storeLocationParser';

type LocationInput = StoreLocation & { storeName?: string; storeNumber?: string };

function cleanField(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || looksLikeAddressFieldJunk(trimmed)) return undefined;
  return trimmed;
}

function hasReceiptAddressHint(location: LocationInput): boolean {
  const city = cleanField(location.storeCity);
  const region = location.storeRegion?.trim().toUpperCase();
  const cityIsRegionOnly = city && region && city.toUpperCase() === region;
  return Boolean(
    cleanField(location.storeAddress) ||
      cleanField(location.storePostalCode) ||
      (city && !cityIsRegionOnly)
  );
}

function buildGeocodeQueries(location: LocationInput): string[] {
  const storeName = cleanField(location.storeName);
  const storeNumber = cleanField(location.storeNumber);
  const storeAddress = cleanField(location.storeAddress);
  const storeCity = cleanField(location.storeCity);
  const storePostalCode = cleanField(location.storePostalCode);

  const queries: string[] = [];
  const push = (value: string | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length < 3) return;
    if (queries.includes(trimmed)) return;
    queries.push(trimmed);
  };

  push([storeName, storeNumber ? `#${storeNumber}` : undefined, storeCity, storePostalCode].filter(Boolean).join(', '));
  push([storeName, storeCity, storePostalCode].filter(Boolean).join(', '));
  push([storeCity, storePostalCode].filter(Boolean).join(', '));
  push(storePostalCode);
  push([storeAddress, storeCity, storePostalCode].filter(Boolean).join(', '));
  push(formatStoreLocationForCopy(location));

  return queries;
}

/** Apply geocode match for auto region detect — never invent a street address from lookup. */
export function buildRegionBackfillFromGeocodeMatch(
  location: LocationInput,
  match: StoreLocation
): Partial<StoreLocation> {
  const partial: Partial<StoreLocation> = {};

  if (match.storeRegion?.trim()) {
    partial.storeRegion = match.storeRegion;
  }
  if (!location.storeCountry?.trim() && match.storeCountry) {
    partial.storeCountry = match.storeCountry;
  }

  return partial;
}

export function useAutoBackfillStoreRegion(
  location: LocationInput | null | undefined,
  onBackfill: (partial: Partial<StoreLocation>) => void,
  enabled = true
) {
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const attemptedRef = useRef(false);

  const detectRegion = useCallback(async (): Promise<boolean> => {
    if (!location || location.storeRegion?.trim()) return false;
    if (!hasReceiptAddressHint(location)) {
      setDetectError('Add a street, city, or ZIP from the receipt in Edit first.');
      return false;
    }

    if (!isGeocodeSearchAvailable()) {
      setDetectError('Address lookup works on web — enter state manually in Edit.');
      return false;
    }

    const queries = buildGeocodeQueries(location);
    if (queries.length === 0) return false;

    setDetecting(true);
    setDetectError(null);

    try {
      for (const query of queries) {
        const { results, error } = await searchGeocodeAddresses({ query, limit: 1 });
        const match = results[0];
        if (match?.storeRegion?.trim()) {
          onBackfill(buildRegionBackfillFromGeocodeMatch(location, match));
          return true;
        }
        if (error && queries.length === 1) {
          setDetectError(error);
        }
      }

      setDetectError('Could not detect state from this address.');
      return false;
    } finally {
      setDetecting(false);
    }
  }, [location, onBackfill]);

  useEffect(() => {
    if (!enabled || !location || location.storeRegion?.trim() || !hasReceiptAddressHint(location)) {
      return;
    }
    if (attemptedRef.current) return;
    attemptedRef.current = true;
    void detectRegion();
  }, [detectRegion, enabled, location]);

  useEffect(() => {
    attemptedRef.current = false;
    setDetectError(null);
  }, [location?.storeAddress, location?.storeCity, location?.storePostalCode, location?.storeName, location?.storeNumber]);

  return { detecting, detectError, detectRegion };
}
