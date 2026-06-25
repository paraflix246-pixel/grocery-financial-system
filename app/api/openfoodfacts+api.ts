import {
  isOpenFoodFactsConfigured,
  searchPricesByName,
} from '@/src/services/openfoodfacts/openFoodFacts.server';

export async function GET(): Promise<Response> {
  return Response.json({
    configured: isOpenFoodFactsConfigured(),
    provider: 'openfoodfacts',
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    action?: string;
    term?: string;
    countryCode?: string;
    limit?: number;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action?.trim() || 'search';
  if (action === 'status') {
    return Response.json({ configured: isOpenFoodFactsConfigured(), provider: 'openfoodfacts' });
  }

  if (action !== 'search') {
    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }

  const term = body.term?.trim();
  if (!term) {
    return Response.json({ error: 'term is required' }, { status: 400 });
  }

  const quotes = await searchPricesByName({
    term,
    countryCode: body.countryCode?.trim() || 'US',
    limit: body.limit ?? 5,
  });

  return Response.json({ quotes });
}
