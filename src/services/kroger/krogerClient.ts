import type { PriceQuote } from '@/src/services/priceRecommendationLogic';

export type KrogerSearchResponse = {
  quotes: PriceQuote[];
  locationId: string | null;
  storeName: string | null;
  error?: string;
};

export type KrogerStatusResponse = {
  configured: boolean;
  provider?: string;
  error?: string;
};

function getKrogerApiUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_KROGER_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/kroger`;
  }
  return null;
}

export async function getKrogerStatus(): Promise<KrogerStatusResponse> {
  const url = getKrogerApiUrl();
  if (!url) return { configured: false, error: 'Kroger API URL is not configured.' };

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return { configured: false, error: `Kroger status failed (${response.status})` };
    }
    return (await response.json()) as KrogerStatusResponse;
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'Kroger status request failed.',
    };
  }
}

export async function searchKrogerProducts(input: {
  term: string;
  zipCode?: string | null;
  locationId?: string | null;
  limit?: number;
}): Promise<KrogerSearchResponse> {
  const url = getKrogerApiUrl();
  if (!url) {
    return { quotes: [], locationId: null, storeName: null, error: 'Kroger API URL is not configured.' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        term: input.term,
        zipCode: input.zipCode ?? undefined,
        locationId: input.locationId ?? undefined,
        limit: input.limit ?? 5,
      }),
    });

    const payload = (await response.json()) as KrogerSearchResponse & { error?: string };
    if (!response.ok) {
      return {
        quotes: [],
        locationId: null,
        storeName: null,
        error: payload.error ?? `Kroger search failed (${response.status})`,
      };
    }

    return {
      quotes: payload.quotes ?? [],
      locationId: payload.locationId ?? null,
      storeName: payload.storeName ?? null,
    };
  } catch (error) {
    return {
      quotes: [],
      locationId: null,
      storeName: null,
      error: error instanceof Error ? error.message : 'Kroger search request failed.',
    };
  }
}
