import { isSerpApiConfigured, searchSerpApiProductQuotes } from '@/src/services/serpapi/serpApi.server';

export async function GET(): Promise<Response> {
  return Response.json({
    configured: isSerpApiConfigured(),
    provider: 'serpapi-google-shopping',
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSerpApiConfigured()) {
    return Response.json(
      {
        error: 'SerpApi is not configured. Set SERPAPI_API_KEY in .env and restart Expo.',
      },
      { status: 503 }
    );
  }

  let body: { action?: string; term?: string; limit?: number };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action?.trim() || 'search';
  if (action === 'status') {
    return Response.json({ configured: true, provider: 'serpapi-google-shopping' });
  }

  if (action !== 'search') {
    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }

  const term = body.term?.trim();
  if (!term) {
    return Response.json({ error: 'term is required' }, { status: 400 });
  }

  try {
    const result = await searchSerpApiProductQuotes({
      term,
      limit: body.limit ?? 8,
    });
    return Response.json(result);
  } catch (error) {
    console.warn('SerpApi product search failed:', error);
    const message = error instanceof Error ? error.message : 'SerpApi product search failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}
