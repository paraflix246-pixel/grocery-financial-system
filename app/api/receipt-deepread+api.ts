import { processReceiptImageWithDeepRead } from '@/src/services/deepreadReceiptParse.server';

export async function GET(): Promise<Response> {
  const configured = Boolean(process.env.DEEPREAD_API_KEY?.trim());
  return Response.json({ configured });
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.DEEPREAD_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      {
        error:
          'DeepRead is not configured. Set DEEPREAD_API_KEY in .env and restart Expo.',
      },
      { status: 503 }
    );
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const imageBase64 = body.imageBase64?.trim();
  if (!imageBase64) {
    return Response.json({ error: 'imageBase64 is required' }, { status: 400 });
  }

  const mimeType = body.mimeType?.trim() || 'image/jpeg';

  try {
    const result = await processReceiptImageWithDeepRead(apiKey, imageBase64, mimeType);

    return Response.json({
      draft: result.draft,
      rawText: result.rawText,
      provider: 'deepread',
      parseVerified: result.parseVerified,
      needsReview: result.needsReview,
      locationNeedsReview: result.locationNeedsReview,
      jobId: result.jobId,
    });
  } catch (error) {
    console.warn('DeepRead receipt scan failed:', error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'DeepRead receipt scan failed.';
    const status = /no line items|no structured receipt/i.test(message) ? 422 : 500;
    return Response.json({ error: message }, { status });
  }
}
