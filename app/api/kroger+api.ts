import { isKrogerConfigured, searchKrogerProductQuotes } from '@/src/services/kroger/krogerApi.server';

export async function GET(): Promise<Response> {
  return Response.json({
    configured: isKrogerConfigured(),
    provider: 'kroger',
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isKrogerConfigured()) {
    return Response.json(
      {
        error:
          'Kroger API is not configured. Set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET in .env and restart Expo.',
      },
      { status: 503 }
    );
  }

  let body: {
    action?: string;
    term?: string;
    zipCode?: string;
    locationId?: string;
    limit?: number;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action?.trim() || 'search';
  if (action === 'status') {
    return Response.json({ configured: true, provider: 'kroger' });
  }

  if (action !== 'search') {
    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }

  const term = body.term?.trim();
  if (!term) {
    return Response.json({ error: 'term is required' }, { status: 400 });
  }

  try {
    const result = await searchKrogerProductQuotes({
      term,
      zipCode: body.zipCode,
      locationId: body.locationId,
      limit: body.limit ?? 5,
    });
    return Response.json(result);
  } catch (error) {
    console.warn('Kroger product search failed:', error);
    const message = error instanceof Error ? error.message : 'Kroger product search failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}
