import { looksLikeReceiptHeaderJunk } from '@/src/utils/receiptHeaderFilter';
import { parseLineEndPrice } from '@/src/utils/priceParser';

export type ParsedStoreLocation = {
  storeAddress?: string;
  storeCity?: string;
  storeRegion?: string;
  storePostalCode?: string;
  storeCountry?: string;
};

const US_STATE_ABBREVS = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
  'WI', 'WY', 'DC',
]);

export const CA_PROVINCE_CODES = new Set([
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
]);

const CA_POSTAL_RE = /\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/i;
const US_ZIP_RE = /\b(\d{5}(?:-\d{4})?)\b/;

const US_STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};

function normalizeRegion(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  if (US_STATE_ABBREVS.has(upper) || CA_PROVINCE_CODES.has(upper)) return upper;
  return US_STATE_NAMES[trimmed.toLowerCase()];
}

function looksLikeStreetLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 4) return false;
  if (looksLikeReceiptHeaderJunk(trimmed)) return false;
  if (/^phone[:\s]/i.test(trimmed)) return false;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed)) return false;
  if (/^(store|shop|market|supercenter|supercentre)\b/i.test(trimmed)) return false;
  if (/\b(sub\s*total|subtotal|total|tax|hst|gst|vat|amount due|balance due|grand total)\b/i.test(trimmed)) {
    return false;
  }
  return /\d/.test(trimmed) && /[a-z]/i.test(trimmed);
}

function parseCityRegionPostal(line: string): ParsedStoreLocation | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const caMatch = trimmed.match(/^(.+?),\s*([A-Z]{2})\s+([A-Z]\d[A-Z]\s?\d[A-Z]\d)\s*$/i);
  if (caMatch) {
    const region = normalizeRegion(caMatch[2]);
    if (region && CA_PROVINCE_CODES.has(region)) {
      return {
        storeCity: caMatch[1].trim(),
        storeRegion: region,
        storePostalCode: caMatch[3].replace(/\s+/g, ' ').toUpperCase(),
        storeCountry: 'CA',
      };
    }
  }

  const usAbbrevMatch = trimmed.match(/^(.+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/i);
  if (usAbbrevMatch) {
    const region = normalizeRegion(usAbbrevMatch[2]);
    if (region && US_STATE_ABBREVS.has(region)) {
      return {
        storeCity: usAbbrevMatch[1].trim(),
        storeRegion: region,
        storePostalCode: usAbbrevMatch[3],
        storeCountry: 'US',
      };
    }
  }

  const usCommaZipMatch = trimmed.match(/^(.+?),\s*([A-Z]{2})\s*,\s*(\d{5}(?:-\d{4})?)\s*$/i);
  if (usCommaZipMatch) {
    const region = normalizeRegion(usCommaZipMatch[2]);
    if (region && US_STATE_ABBREVS.has(region)) {
      return {
        storeCity: usCommaZipMatch[1].trim(),
        storeRegion: region,
        storePostalCode: usCommaZipMatch[3],
        storeCountry: 'US',
      };
    }
  }

  const usNameMatch = trimmed.match(/^(.+?),\s*([A-Za-z .]+)\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (usNameMatch) {
    const region = normalizeRegion(usNameMatch[2]);
    if (region && US_STATE_ABBREVS.has(region)) {
      return {
        storeCity: usNameMatch[1].trim(),
        storeRegion: region,
        storePostalCode: usNameMatch[3],
        storeCountry: 'US',
      };
    }
  }

  const usCityOnlyMatch = trimmed.match(/^(.+?),\s*([A-Z]{2})\s*$/i);
  if (usCityOnlyMatch) {
    const region = normalizeRegion(usCityOnlyMatch[2]);
    if (region && US_STATE_ABBREVS.has(region)) {
      return {
        storeCity: usCityOnlyMatch[1].trim(),
        storeRegion: region,
        storeCountry: 'US',
      };
    }
  }

  return null;
}

function splitAddressSegments(raw: string): string[] {
  return raw
    .split(/[\n/|]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** Vision/AI sometimes puts markdown image refs or bare filenames in storeAddress. */
export function looksLikeAddressFieldJunk(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^!\[[^\]]*\]\([^)]+\)/.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^img-\d+\.(jpe?g|png|gif|webp)$/i.test(trimmed)) return true;
  if (/\.(jpe?g|png|gif|webp)(\)|$|\s)/i.test(trimmed) && !/\d+\s+[a-z]/i.test(trimmed)) return true;
  return false;
}

function sanitizeLocationText(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const cleaned = value.trim();
  if (looksLikeAddressFieldJunk(cleaned)) return undefined;
  return cleaned;
}

/** DeepRead sometimes puts line items (e.g. "Eggs ... $3.49") into storeAddress. */
export function looksLikeReceiptItemInAddress(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3) return false;
  if (parseCityRegionPostal(trimmed)) return false;
  if (looksLikeReceiptHeaderJunk(trimmed)) return false;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed)) return false;
  if (/\b(sub\s*total|subtotal|total|tax|hst|gst|vat)\b/i.test(trimmed)) return false;

  const price = parseLineEndPrice(trimmed);
  if (price == null || price <= 0) return false;

  const withoutPrice = trimmed.replace(/\$?\s*\d+\.\d{2}\s*$/, '').replace(/\.+/g, '').trim();
  return withoutPrice.length >= 2 && /[a-z]{2,}/i.test(withoutPrice);
}

function sanitizeStoreAddressField(address: string | undefined): string | undefined {
  if (!address?.trim()) return undefined;

  const kept = splitAddressSegments(address).filter(
    (line) => !looksLikeReceiptItemInAddress(line) && !looksLikeAddressFieldJunk(line)
  );
  if (kept.length === 0) return undefined;
  return kept.join('\n');
}

function absorbCityRegionFromCityField(location: ParsedStoreLocation): ParsedStoreLocation {
  const city = location.storeCity?.trim();
  if (!city || location.storeRegion?.trim()) return location;

  const parsed = parseCityRegionPostal(city);
  if (!parsed?.storeRegion) return location;

  return {
    ...location,
    storeCity: parsed.storeCity ?? location.storeCity,
    storeRegion: parsed.storeRegion,
    storePostalCode: location.storePostalCode ?? parsed.storePostalCode,
    storeCountry: location.storeCountry ?? parsed.storeCountry,
  };
}

function absorbCityRegionFromAddress(location: ParsedStoreLocation): ParsedStoreLocation {
  const address = location.storeAddress?.trim();
  if (!address) return location;

  const segments = splitAddressSegments(address);
  if (segments.length === 0) return location;

  const citySegments = segments.filter((segment) => parseCityRegionPostal(segment));
  if (citySegments.length === 0) return location;

  const parsed = parseCityRegionPostal(citySegments[citySegments.length - 1]!)!;
  const streetSegments = segments.filter(
    (segment) => !parseCityRegionPostal(segment) && !looksLikeReceiptItemInAddress(segment)
  );

  return {
    ...location,
    storeAddress: streetSegments.length > 0 ? streetSegments.join('\n') : undefined,
    storeCity: location.storeCity ?? parsed.storeCity,
    storeRegion: location.storeRegion ?? parsed.storeRegion,
    storePostalCode: location.storePostalCode ?? parsed.storePostalCode,
    storeCountry: location.storeCountry ?? parsed.storeCountry,
  };
}

export function parseStoreLocationFromOcrLines(lines: string[]): ParsedStoreLocation {
  const cleaned = lines.map((line) => line.trim()).filter(Boolean);
  if (cleaned.length === 0) return {};

  for (let i = 0; i < Math.min(cleaned.length, 12); i++) {
    const parsed = parseCityRegionPostal(cleaned[i]);
    if (!parsed) continue;

    const streetLines: string[] = [];
    for (let j = i - 1; j >= 0 && streetLines.length < 3; j--) {
      const candidate = cleaned[j];
      if (looksLikeStreetLine(candidate)) {
        streetLines.unshift(candidate);
        continue;
      }
      break;
    }

    return { ...parsed, storeAddress: streetLines.length > 0 ? streetLines.join('\n') : undefined };
  }

  const streetOnly = cleaned.slice(0, 6).filter(looksLikeStreetLine);
  if (streetOnly.length > 0) {
    return { storeAddress: streetOnly.join('\n') };
  }

  return {};
}

export function parseStoreLocationFromOcrText(text: string): ParsedStoreLocation {
  if (!text?.trim()) return {};
  return parseStoreLocationFromOcrLines(text.split(/\r?\n/));
}

export function inferStoreCountry(
  location: ParsedStoreLocation
): ParsedStoreLocation['storeCountry'] | undefined {
  const explicit = location.storeCountry?.trim().toUpperCase();
  if (explicit === 'US' || explicit === 'CA') return explicit;

  const postal = location.storePostalCode?.trim() ?? '';
  if (CA_POSTAL_RE.test(postal)) return 'CA';
  if (US_ZIP_RE.test(postal)) return 'US';

  const region = location.storeRegion?.trim().toUpperCase();
  if (region && CA_PROVINCE_CODES.has(region)) return 'CA';

  const blob = [location.storeAddress, location.storeCity, postal].filter(Boolean).join(' ');
  if (CA_POSTAL_RE.test(blob)) return 'CA';
  if (US_ZIP_RE.test(blob)) return 'US';

  if (region && US_STATE_ABBREVS.has(region)) {
    // "CA" is California — only treat as US when no Canadian postal pattern is present.
    if (region === 'CA' && CA_POSTAL_RE.test(blob)) return 'CA';
    return 'US';
  }

  return undefined;
}

function stripDuplicateCityLineFromAddress(location: ParsedStoreLocation): ParsedStoreLocation {
  const address = location.storeAddress?.trim();
  if (!address) return location;

  const lines = address.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { ...location, storeAddress: undefined };

  const lastLine = lines[lines.length - 1]!;
  const parsed = parseCityRegionPostal(lastLine);
  if (parsed) {
    const next = {
      ...location,
      storeAddress: lines.length > 1 ? lines.slice(0, -1).join('\n') : undefined,
      storeCity: location.storeCity ?? parsed.storeCity,
      storeRegion: location.storeRegion ?? parsed.storeRegion,
      storePostalCode: location.storePostalCode ?? parsed.storePostalCode,
      storeCountry: location.storeCountry ?? parsed.storeCountry,
    };
    return stripDuplicateCityLineFromAddress(next);
  }

  if (location.storeCity && location.storeRegion) {
    const cityLower = location.storeCity.trim().toLowerCase();
    const filtered = lines.filter((line) => {
      const lineParsed = parseCityRegionPostal(line);
      if (!lineParsed) return true;
      return lineParsed.storeCity?.trim().toLowerCase() !== cityLower;
    });
    if (filtered.length !== lines.length) {
      return {
        ...location,
        storeAddress: filtered.length > 0 ? filtered.join('\n') : undefined,
      };
    }
  }

  return { ...location, storeAddress: lines.join('\n') };
}

function extractRegionFromLocationFields(location: ParsedStoreLocation): ParsedStoreLocation {
  if (location.storeRegion?.trim()) return location;

  const blob = [location.storeAddress, location.storeCity, location.storePostalCode]
    .filter(Boolean)
    .join('\n');
  if (!blob.trim()) return location;

  const parsed = parseStoreLocationFromOcrText(blob);
  if (!parsed.storeRegion) return location;

  return {
    ...location,
    storeCity: location.storeCity ?? parsed.storeCity,
    storeRegion: parsed.storeRegion,
    storePostalCode: location.storePostalCode ?? parsed.storePostalCode,
    storeCountry: location.storeCountry ?? parsed.storeCountry,
  };
}

/** Infer country, normalize region, and split duplicated city lines out of storeAddress. */
export function normalizeStoreLocation(location: ParsedStoreLocation): ParsedStoreLocation {
  let next: ParsedStoreLocation = {
    storeAddress: sanitizeStoreAddressField(location.storeAddress),
    storeCity: sanitizeLocationText(location.storeCity),
    storeRegion: sanitizeLocationText(location.storeRegion),
    storePostalCode: sanitizeLocationText(location.storePostalCode),
    storeCountry: location.storeCountry,
  };
  next = absorbCityRegionFromCityField(next);
  next = absorbCityRegionFromAddress(next);
  next = extractRegionFromLocationFields(next);
  next = stripDuplicateCityLineFromAddress(next);

  if (next.storeRegion) {
    const normalizedRegion = normalizeRegion(next.storeRegion);
    if (normalizedRegion) next = { ...next, storeRegion: normalizedRegion };
  }

  if (
    next.storeCity?.trim().toUpperCase() === next.storeRegion?.trim().toUpperCase()
  ) {
    next = { ...next, storeCity: undefined };
  }

  const country = inferStoreCountry(next);
  if (country) next = { ...next, storeCountry: country };

  if (next.storePostalCode) {
    const postal = next.storePostalCode.trim();
    next = {
      ...next,
      storePostalCode: CA_POSTAL_RE.test(postal)
        ? postal.replace(/\s+/g, ' ').toUpperCase()
        : postal,
    };
  }

  return next;
}

export function formatStoreLocationForCopy(location: ParsedStoreLocation): string {
  const normalized = normalizeStoreLocation(location);
  const parts: string[] = [];
  if (normalized.storeAddress?.trim()) parts.push(normalized.storeAddress.trim());

  const cityParts = [
    normalized.storeCity,
    normalized.storeRegion,
    normalized.storePostalCode,
  ].filter((part, index, all) => {
    if (!part?.trim()) return false;
    if (index === 1 && part.trim().toUpperCase() === all[0]?.trim().toUpperCase()) return false;
    return true;
  });
  const cityLine = cityParts.join(', ');
  if (cityLine) parts.push(cityLine);

  const country = inferStoreCountry(normalized);
  if (country) parts.push(country === 'CA' ? 'Canada' : 'United States');
  return parts.join('\n').trim();
}

export function mergeStoreLocation(
  primary?: ParsedStoreLocation | null,
  fallback?: ParsedStoreLocation | null
): ParsedStoreLocation {
  return normalizeStoreLocation({
    storeAddress: primary?.storeAddress?.trim() || fallback?.storeAddress?.trim() || undefined,
    storeCity: primary?.storeCity?.trim() || fallback?.storeCity?.trim() || undefined,
    storeRegion: primary?.storeRegion?.trim() || fallback?.storeRegion?.trim() || undefined,
    storePostalCode:
      primary?.storePostalCode?.trim() || fallback?.storePostalCode?.trim() || undefined,
    storeCountry: primary?.storeCountry || fallback?.storeCountry || undefined,
  });
}

export function applyStoreLocationToDraft<T extends ParsedStoreLocation>(
  draft: T,
  location: ParsedStoreLocation
): T {
  return {
    ...draft,
    storeAddress: location.storeAddress ?? draft.storeAddress,
    storeCity: location.storeCity ?? draft.storeCity,
    storeRegion: location.storeRegion ?? draft.storeRegion,
    storePostalCode: location.storePostalCode ?? draft.storePostalCode,
    storeCountry: location.storeCountry ?? draft.storeCountry,
  };
}
