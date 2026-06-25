import {
  fetchMarketplaceDeals,
  getMarketplaceProviderStatus,
} from '@/src/services/marketplace/marketplace.server';

export async function GET(): Promise<Response> {
  const status = getMarketplaceProviderStatus();
  return Response.json(status);
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    action?: string;
    zipCode?: string;
    locationId?: string;
    limit?: number;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action?.trim() || 'deals';
  if (action !== 'deals') {
    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }

  try {
    const result = await fetchMarketplaceDeals({
      zipCode: body.zipCode,
      locationId: body.locationId,
      limit: body.limit ?? 12,
    });
    return Response.json(result);
  } catch (error) {
    console.warn('Marketplace deal fetch failed:', error);
    const message = error instanceof Error ? error.message : 'Marketplace deal fetch failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}
