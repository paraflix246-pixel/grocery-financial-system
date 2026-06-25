import { searchNominatimAddresses } from '@/src/services/geocode/nominatim.server';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 5;

  if (!query) {
    return Response.json({ error: 'q is required' }, { status: 400 });
  }

  if (query.length < 3) {
    return Response.json({ results: [] });
  }

  try {
    const results = await searchNominatimAddresses({ query, limit });
    return Response.json({ results });
  } catch (error) {
    console.warn('Geocode search failed:', error);
    const message = error instanceof Error ? error.message : 'Geocode search failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: { query?: string; q?: string; limit?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const query = (body.query ?? body.q)?.trim() ?? '';
  if (!query) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  if (query.length < 3) {
    return Response.json({ results: [] });
  }

  try {
    const results = await searchNominatimAddresses({ query, limit: body.limit ?? 5 });
    return Response.json({ results });
  } catch (error) {
    console.warn('Geocode search failed:', error);
    const message = error instanceof Error ? error.message : 'Geocode search failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}
