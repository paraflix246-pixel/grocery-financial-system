import type { MarketplaceFetchResult } from '@/src/services/marketplace/marketplaceTypes';

export type MarketplaceStatusResponse = {
  krogerConfigured: boolean;
  serpapiConfigured: boolean;
  error?: string;
};

function getMarketplaceApiUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_MARKETPLACE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/marketplace`;
  }
  return null;
}

export async function getMarketplaceStatus(): Promise<MarketplaceStatusResponse> {
  const url = getMarketplaceApiUrl();
  if (!url) {
    return {
      krogerConfigured: false,
      serpapiConfigured: false,
      error: 'Marketplace API URL is not configured.',
    };
  }

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return {
        krogerConfigured: false,
        serpapiConfigured: false,
        error: `Marketplace status failed (${response.status})`,
      };
    }
    return (await response.json()) as MarketplaceStatusResponse;
  } catch (error) {
    return {
      krogerConfigured: false,
      serpapiConfigured: false,
      error: error instanceof Error ? error.message : 'Marketplace status request failed.',
    };
  }
}

export async function fetchMarketplaceDeals(input: {
  zipCode?: string | null;
  locationId?: string | null;
  limit?: number;
}): Promise<MarketplaceFetchResult & { error?: string }> {
  const url = getMarketplaceApiUrl();
  if (!url) {
    return {
      deals: [],
      sources: {
        kroger: { available: false, count: 0 },
        serpapi: { available: false, count: 0 },
        weeklyAds: { count: 0 },
      },
      statusMessage: 'Marketplace API is not available on this platform. Use the web app or set EXPO_PUBLIC_MARKETPLACE_API_URL.',
      error: 'Marketplace API URL is not configured.',
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deals',
        zipCode: input.zipCode ?? undefined,
        locationId: input.locationId ?? undefined,
        limit: input.limit ?? 12,
      }),
    });

    const payload = (await response.json()) as MarketplaceFetchResult & { error?: string };
    if (!response.ok) {
      return {
        deals: payload.deals ?? [],
        sources: payload.sources ?? {
          kroger: { available: false, count: 0, error: payload.error },
          serpapi: { available: false, count: 0 },
          weeklyAds: { count: 0 },
        },
        statusMessage: payload.statusMessage ?? 'Failed to load marketplace deals.',
        error: payload.error ?? `Marketplace fetch failed (${response.status})`,
      };
    }

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Marketplace fetch request failed.';
    return {
      deals: [],
      sources: {
        kroger: { available: false, count: 0 },
        serpapi: { available: false, count: 0 },
        weeklyAds: { count: 0 },
      },
      statusMessage: 'Could not reach the marketplace service. Pull to refresh or try again later.',
      error: message,
    };
  }
}
