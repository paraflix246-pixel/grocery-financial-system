import { fetchPaddleOcrOverlay } from '@/src/services/ocr/paddleOcrServer';
import {
  buildReceiptDraftFromOcrOverlay,
  type PaddleScanResult,
} from '@/src/services/receiptPaddleParse';

import { resolveProductionSafeUrl } from '@/src/utils/productionEnvGuard';

export async function POST(request: Request): Promise<Response> {
  const paddleUrl = resolveProductionSafeUrl(process.env.PADDLEOCR_API_URL, 'PADDLEOCR_API_URL');
  if (!paddleUrl) {
    return Response.json(
      {
        error:
          'PaddleOCR is not configured. Set PADDLEOCR_API_URL to your hosted OCR service (not localhost in production).',
      },
      { status: 503 }
    );
  }

  let body: { imageBase64?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const imageBase64 = body.imageBase64?.trim();
  if (!imageBase64) {
    return Response.json({ error: 'imageBase64 is required' }, { status: 400 });
  }

  try {
    const overlay = await fetchPaddleOcrOverlay(imageBase64, paddleUrl);
    if (!overlay) {
      return Response.json(
        {
          error:
            'PaddleOCR returned no text. If the service just started, wait for model warm-up and retry. Otherwise try a clearer photo.',
        },
        { status: 422 }
      );
    }

    const result: PaddleScanResult = {
      draft: buildReceiptDraftFromOcrOverlay(overlay),
      rawText: overlay.rawText,
    };

    return Response.json({
      draft: result.draft,
      rawText: result.rawText,
      provider: 'paddleocr',
    });
  } catch (error) {
    console.warn('Paddle receipt OCR failed:', error);
    return Response.json({ error: 'PaddleOCR scan failed' }, { status: 500 });
  }
}
