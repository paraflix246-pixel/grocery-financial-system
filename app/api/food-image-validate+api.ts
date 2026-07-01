import {
  isFoodImageVisionConfigured,
  validateFoodImageWithVisionServer,
} from '@/src/services/commons/foodImageValidation.server';

export async function GET(): Promise<Response> {
  return Response.json({
    configured: isFoodImageVisionConfigured(),
    provider: 'openai-vision',
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: {
    imageUrl?: string;
    term?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const imageUrl = body.imageUrl?.trim();
  const term = body.term?.trim();
  if (!imageUrl || !term) {
    return Response.json({ error: 'imageUrl and term are required' }, { status: 400 });
  }

  try {
    const result = await validateFoodImageWithVisionServer({ imageUrl, term });
    return Response.json(result);
  } catch (error) {
    console.warn('Food image vision validation failed:', error);
    return Response.json(
      { approved: true, reason: 'vision-unavailable', tier: 'vision' },
      { status: 200 }
    );
  }
}
