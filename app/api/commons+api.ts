import { searchCommonsFoodImage } from '@/src/services/commons/commonsImage.server';

export async function GET(): Promise<Response> {
  return Response.json({
    configured: true,
    provider: 'wikimedia-commons',
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    action?: string;
    term?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action?.trim() || 'search';
  if (action === 'status') {
    return Response.json({ configured: true, provider: 'wikimedia-commons' });
  }

  if (action !== 'search') {
    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  }

  const term = body.term?.trim();
  if (!term) {
    return Response.json({ error: 'term is required' }, { status: 400 });
  }

  try {
    const image = await searchCommonsFoodImage({ term });
    return Response.json({ image });
  } catch (error) {
    console.warn('Commons image search failed:', error);
    const message = error instanceof Error ? error.message : 'Commons image search failed.';
    return Response.json({ image: null, error: message }, { status: 502 });
  }
}
