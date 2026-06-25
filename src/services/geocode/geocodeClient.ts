import type { StoreLocation } from '@/src/models/types';

export type GeocodeSuggestion = StoreLocation & { label: string };

export type GeocodeSearchResponse = {
  results: GeocodeSuggestion[];
  error?: string;
};

function getGeocodeProxyUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_GEOCODE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/geocode`;
  }
  return null;
}

export function isGeocodeSearchAvailable(): boolean {
  return getGeocodeProxyUrl() != null;
}

export async function searchGeocodeAddresses(input: {
  query: string;
  limit?: number;
}): Promise<GeocodeSearchResponse> {
  const baseUrl = getGeocodeProxyUrl();
  if (!baseUrl) {
    return { results: [], error: 'Address search is only available on web.' };
  }

  const query = input.query.trim();
  if (query.length < 3) {
    return { results: [] };
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(input.limit ?? 5));

    const response = await fetch(url.toString(), { method: 'GET' });
    const payload = (await response.json()) as GeocodeSearchResponse;
    if (!response.ok) {
      return { results: [], error: payload.error ?? `Geocode search failed (${response.status})` };
    }
    return { results: payload.results ?? [] };
  } catch (error) {
    return {
      results: [],
      error: error instanceof Error ? error.message : 'Geocode search request failed.',
    };
  }
}
