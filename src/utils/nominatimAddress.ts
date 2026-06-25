import type { StoreLocation } from '@/src/models/types';

export type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country_code?: string;
};

export type NominatimSearchResult = {
  place_id: number;
  display_name: string;
  address?: NominatimAddress;
};

const US_STATE_NAMES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
};

const CA_PROVINCE_NAMES: Record<string, string> = {
  alberta: 'AB',
  'british columbia': 'BC',
  manitoba: 'MB',
  'new brunswick': 'NB',
  'newfoundland and labrador': 'NL',
  'nova scotia': 'NS',
  ontario: 'ON',
  'prince edward island': 'PE',
  quebec: 'QC',
  saskatchewan: 'SK',
  'northwest territories': 'NT',
  nunavut: 'NU',
  yukon: 'YT',
};

function normalizeRegion(value: string | undefined, countryCode?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();
  if (upper.length === 2) return upper;

  const lower = trimmed.toLowerCase();
  if (countryCode === 'ca') {
    return CA_PROVINCE_NAMES[lower] ?? upper.slice(0, 2);
  }
  return US_STATE_NAMES[lower] ?? upper.slice(0, 2);
}

function streetFromAddress(address: NominatimAddress): string | undefined {
  const road = address.road ?? address.pedestrian ?? address.footway;
  if (!road) return undefined;
  if (address.house_number) {
    return `${address.house_number} ${road}`.trim();
  }
  return road.trim();
}

function cityFromAddress(address: NominatimAddress): string | undefined {
  return (
    address.city?.trim() ||
    address.town?.trim() ||
    address.village?.trim() ||
    address.municipality?.trim() ||
    address.county?.trim() ||
    undefined
  );
}

export function parseNominatimResult(result: NominatimSearchResult): StoreLocation & { label: string } {
  const address = result.address ?? {};
  const countryCode = address.country_code?.toLowerCase();
  const storeCountry = countryCode === 'ca' ? 'CA' : countryCode === 'us' ? 'US' : undefined;

  return {
    label: result.display_name,
    storeAddress: streetFromAddress(address),
    storeCity: cityFromAddress(address),
    storeRegion: normalizeRegion(address.state, countryCode),
    storePostalCode: address.postcode?.trim(),
    storeCountry,
  };
}

export function parseNominatimResults(results: NominatimSearchResult[]): Array<StoreLocation & { label: string }> {
  return results
    .filter((result) => {
      const code = result.address?.country_code?.toLowerCase();
      return code === 'us' || code === 'ca';
    })
    .map(parseNominatimResult);
}
