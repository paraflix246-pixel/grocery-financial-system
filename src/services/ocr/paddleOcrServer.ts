import type { OcrLine, OcrOverlay } from '@/src/services/ocr/ocrOverlayTypes';

/** PaddleOCR on CPU can exceed 30s; Expo API routes use fetch-nodeshim with a 30s default. */
export const PADDLE_OCR_REQUEST_TIMEOUT_MS = 180_000;

type PaddleOcrFetchInit = RequestInit & { connectTimeout?: number };

function buildPaddleOcrFetchInit(body: string): PaddleOcrFetchInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(PADDLE_OCR_REQUEST_TIMEOUT_MS),
    connectTimeout: PADDLE_OCR_REQUEST_TIMEOUT_MS,
  };
}

function isPaddleOcrTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'TimeoutError' || error.name === 'AbortError') return true;
  if ('code' in error && (error as NodeJS.ErrnoException).code === 'ETIMEDOUT') return true;
  return /timed out/i.test(error.message);
}

type PaddleOcrWord = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
  confidence?: number;
};

type PaddleOcrLine = {
  top: number;
  words: PaddleOcrWord[];
  confidence?: number;
};

type PaddleOcrResponse = {
  rawText?: string;
  lines?: PaddleOcrLine[];
  error?: string;
};

/**
 * Calls a self-hosted PaddleOCR FastAPI service.
 * Set PADDLEOCR_API_URL (e.g. http://localhost:8089) in the environment.
 */
export async function fetchPaddleOcrOverlay(
  imageBase64: string,
  apiUrl: string
): Promise<OcrOverlay | null> {
  const base = apiUrl.replace(/\/+$/, '');
  const endpoint = `${base}/ocr`;

  try {
    const response = await fetch(
      endpoint,
      buildPaddleOcrFetchInit(JSON.stringify({ imageBase64 }))
    );

    if (!response.ok) {
      console.warn('PaddleOCR service error:', response.status, await response.text());
      return null;
    }

    const payload = (await response.json()) as PaddleOcrResponse;
    if (payload.error || !payload.lines?.length) {
      if (payload.rawText?.trim()) {
        return { rawText: payload.rawText.trim(), lines: [] };
      }
      return null;
    }

    const lines: OcrLine[] = payload.lines
      .map((line) => ({
        top: line.top ?? line.words[0]?.top ?? 0,
        words: (line.words ?? [])
          .filter((word) => word.text?.trim())
          .map((word) => ({
            text: word.text.trim(),
            left: word.left ?? 0,
            top: word.top ?? 0,
            width: word.width ?? 0,
            height: word.height ?? 0,
          })),
      }))
      .filter((line) => line.words.length > 0)
      .sort((a, b) => a.top - b.top);

    const rawText =
      payload.rawText?.trim() ||
      lines
        .map((line) => line.words.map((word) => word.text).join(' '))
        .join('\n');

    if (!rawText && lines.length === 0) return null;

    return { rawText, lines };
  } catch (error) {
    if (isPaddleOcrTimeoutError(error)) {
      console.warn(
        `PaddleOCR request timed out after ${PADDLE_OCR_REQUEST_TIMEOUT_MS / 1000}s — retry or wait for model warm-up:`,
        error
      );
    } else {
      console.warn('PaddleOCR request failed:', error);
    }
    return null;
  }
}
