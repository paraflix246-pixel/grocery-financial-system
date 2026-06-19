type VisionAnnotateResponse = {
  responses?: Array<{
    fullTextAnnotation?: { text?: string };
    textAnnotations?: Array<{ description?: string }>;
    error?: { message?: string };
  }>;
};

type OcrSpaceResponse = {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ParsedResults?: Array<{
    ParsedText?: string;
    FileParseExitCode?: number;
    ErrorMessage?: string;
  }>;
};

function estimateConfidence(text: string): number {
  const prices = text.match(/\d+\.\d{2}/g) ?? [];
  let score = 70;
  if (text.length > 80) score += 5;
  if (prices.length >= 3) score += 10;
  if (/total/i.test(text)) score += 5;
  return Math.min(95, score);
}

function toStructuredLines(text: string) {
  return text
    .split('\n')
    .map((line, index) => ({ text: line.trim(), y: index }))
    .filter((line) => line.text.length > 0);
}

async function recognizeWithOcrSpace(
  imageBase64: string,
  apiKey: string
): Promise<{ text: string; confidence: number; structuredLines: ReturnType<typeof toStructuredLines> } | null> {
  const formData = new FormData();
  formData.append('apikey', apiKey);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');
  formData.append('base64Image', `data:image/jpeg;base64,${imageBase64}`);

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    console.warn('OCR.space error:', response.status);
    return null;
  }

  const payload = (await response.json()) as OcrSpaceResponse;
  if (payload.IsErroredOnProcessing || payload.OCRExitCode !== 1) {
    const message = Array.isArray(payload.ErrorMessage)
      ? payload.ErrorMessage.join(', ')
      : payload.ErrorMessage;
    console.warn('OCR.space processing error:', message);
    return null;
  }

  const parsed = payload.ParsedResults?.[0];
  const text = parsed?.ParsedText?.trim() ?? '';
  if (!text || parsed?.FileParseExitCode !== 1) {
    return null;
  }

  return {
    text,
    confidence: estimateConfidence(text),
    structuredLines: toStructuredLines(text),
  };
}

async function recognizeWithGoogleVision(
  imageBase64: string,
  apiKey: string
): Promise<{ text: string; confidence: number; structuredLines: ReturnType<typeof toStructuredLines> } | null> {
  const visionResponse = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    }
  );

  if (!visionResponse.ok) {
    console.warn('Vision API error:', visionResponse.status);
    return null;
  }

  const payload = (await visionResponse.json()) as VisionAnnotateResponse;
  const first = payload.responses?.[0];
  if (first?.error?.message) {
    console.warn('Vision API message:', first.error.message);
    return null;
  }

  const text =
    first?.fullTextAnnotation?.text?.trim() ??
    first?.textAnnotations?.[0]?.description?.trim() ??
    '';

  if (!text) return null;

  return {
    text,
    confidence: estimateConfidence(text),
    structuredLines: toStructuredLines(text),
  };
}

export async function POST(request: Request): Promise<Response> {
  const ocrSpaceKey = process.env.OCR_SPACE_API_KEY?.trim();
  const visionKey = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();

  if (!ocrSpaceKey && !visionKey) {
    return Response.json(
      {
        error:
          'Cloud OCR is not configured. Set OCR_SPACE_API_KEY or GOOGLE_CLOUD_VISION_API_KEY in your environment.',
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
    if (ocrSpaceKey) {
      const ocrSpaceResult = await recognizeWithOcrSpace(imageBase64, ocrSpaceKey);
      if (ocrSpaceResult) {
        return Response.json({
          ...ocrSpaceResult,
          provider: 'ocr_space',
        });
      }
    }

    if (visionKey) {
      const visionResult = await recognizeWithGoogleVision(imageBase64, visionKey);
      if (visionResult) {
        return Response.json({
          ...visionResult,
          provider: 'cloud_vision',
        });
      }
    }

    return Response.json({ error: 'No text detected' }, { status: 422 });
  } catch (error) {
    console.warn('OCR API route failed:', error);
    return Response.json({ error: 'OCR processing failed' }, { status: 500 });
  }
}
