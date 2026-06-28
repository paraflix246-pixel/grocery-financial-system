import {
  isScraperApiConfigured,
  searchScraperApiProductQuotes,
} from '@/src/services/scraperapi/scraperApi.server';

export async function GET(): Promise<Response> {
  return Response.json({
    configured: isScraperApiConfigured(),
    provider: 'scraperapi-walmart',
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isScraperApiConfigured()) {
    return Response.json(
      {
        error: 'ScraperAPI is not configured. Set SCRAPERAPI_API_KEY in .env and restart Expo.',
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
    return Response.json({ configured: true, provider: 'scraperapi-walmart' });
  }

  if (action !== 'search') {
    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }

  const term = body.term?.trim();
  if (!term) {
    return Response.json({ error: 'term is required' }, { status: 400 });
  }

  try {
    const result = await searchScraperApiProductQuotes({
      term,
      limit: body.limit ?? 8,
    });
    if (result.error) {
      return Response.json({ quotes: [], error: result.error }, { status: 502 });
    }
    return Response.json(result);
  } catch (error) {
    console.warn('ScraperAPI Walmart search failed:', error);
    const message = error instanceof Error ? error.message : 'ScraperAPI Walmart search failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}
