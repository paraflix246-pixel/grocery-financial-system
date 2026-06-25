import type { OcrOverlay, OcrOverlayProvider } from '@/src/services/ocr/ocrOverlayTypes';
import { fetchPaddleOcrOverlay } from '@/src/services/ocr/paddleOcrServer';
import { fetchOcrSpaceOverlay } from '@/src/services/ocr/ocrSpaceServer';

export type { OcrOverlay, OcrLine, OcrWord, OcrOverlayProvider } from '@/src/services/ocr/ocrOverlayTypes';

/**
 * Fetch receipt OCR with word layout. Prefers PaddleOCR when configured, then OCR.space.
 */
export async function fetchReceiptOcrOverlay(
  imageBase64: string,
  options: {
    paddleOcrUrl?: string | null;
    ocrSpaceKey?: string | null;
  }
): Promise<{ overlay: OcrOverlay | null; provider: OcrOverlayProvider }> {
  const paddleUrl = options.paddleOcrUrl?.trim();
  if (paddleUrl) {
    const overlay = await fetchPaddleOcrOverlay(imageBase64, paddleUrl);
    if (overlay) {
      return { overlay, provider: 'paddleocr' };
    }
    console.warn('PaddleOCR unavailable — falling back to OCR.space');
  }

  const ocrSpaceKey = options.ocrSpaceKey?.trim();
  if (ocrSpaceKey) {
    const overlay = await fetchOcrSpaceOverlay(imageBase64, ocrSpaceKey);
    if (overlay) {
      return { overlay, provider: 'ocrspace' };
    }
  }

  return { overlay: null, provider: 'none' };
}
