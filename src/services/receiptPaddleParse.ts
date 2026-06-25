import { Platform } from 'react-native';

import type { ParsedReceiptDraft } from '@/src/models/types';
import type { OcrOverlay } from '@/src/services/ocr/ocrOverlayTypes';
import {
  fetchPaddleOcrOverlay,
  PADDLE_OCR_REQUEST_TIMEOUT_MS,
} from '@/src/services/ocr/paddleOcrServer';
import { parseReceiptText } from '@/src/services/receiptParser';
import { imageUriToBase64 } from '@/src/services/receiptImageEncode';
import { finalizeReceiptDraft } from '@/src/utils/receiptDraftNormalizer';
import { buildLineItemsFromOverlay, pickOcrDraftLineItems } from '@/src/utils/ocrSpatialLayout';

export type PaddleScanResult = {
  draft: ParsedReceiptDraft;
  rawText: string;
};

export function buildReceiptDraftFromOcrOverlay(overlay: OcrOverlay): ParsedReceiptDraft {
  const rawText = overlay.rawText.trim();
  const textDraft = parseReceiptText(rawText);
  const spatial = buildLineItemsFromOverlay(overlay.lines);
  const preferredItems = pickOcrDraftLineItems(
    textDraft.items,
    spatial.items,
    textDraft.subtotal,
    rawText
  );
  const ocrDraft: ParsedReceiptDraft = {
    ...textDraft,
    storeName: textDraft.storeName || 'Unknown Store',
    date: textDraft.date,
    items: preferredItems,
  };
  const finalized = finalizeReceiptDraft(ocrDraft, rawText, ocrDraft);
  return {
    ...finalized,
    storeName:
      /^unknown store$/i.test(finalized.storeName) && textDraft.storeName
        ? textDraft.storeName
        : finalized.storeName,
  };
}

function resolveReceiptOcrApiUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_RECEIPT_OCR_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/api/receipt-ocr`;
  }

  return null;
}

function resolveDirectPaddleUrl(): string | null {
  return process.env.EXPO_PUBLIC_PADDLEOCR_API_URL?.trim() || null;
}

async function parseViaApi(imageBase64: string): Promise<PaddleScanResult | null> {
  const apiUrl = resolveReceiptOcrApiUrl();
  if (!apiUrl) return null;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
    signal: AbortSignal.timeout(PADDLE_OCR_REQUEST_TIMEOUT_MS),
    connectTimeout: PADDLE_OCR_REQUEST_TIMEOUT_MS,
  } as RequestInit & { connectTimeout?: number });

  if (!response.ok) {
    const errorBody = await response.text();
    console.warn('Paddle OCR API error:', response.status, errorBody);
    let apiError = 'Receipt scan failed. Please try again.';
    try {
      const parsed = JSON.parse(errorBody) as { error?: string };
      if (parsed.error) apiError = parsed.error;
    } catch {
      // ignore non-JSON error bodies
    }
    if (response.status === 422 && apiError.includes('no text')) {
      throw new Error(
        'Could not read text from this receipt photo. Try a clearer, flatter shot with all text visible.'
      );
    }
    if (response.status === 503) {
      return null;
    }
    throw new Error(apiError);
  }

  const payload = (await response.json()) as {
    draft?: ParsedReceiptDraft;
    rawText?: string;
    error?: string;
  };

  if (payload.error || !payload.draft) return null;

  return {
    draft: payload.draft,
    rawText: payload.rawText?.trim() ?? '',
  };
}

async function parseViaDirectPaddle(imageBase64: string): Promise<PaddleScanResult | null> {
  const paddleUrl = resolveDirectPaddleUrl();
  if (!paddleUrl) return null;

  const overlay = await fetchPaddleOcrOverlay(imageBase64, paddleUrl);
  if (!overlay) return null;

  return {
    draft: buildReceiptDraftFromOcrOverlay(overlay),
    rawText: overlay.rawText,
  };
}

/** Scan a receipt image using PaddleOCR only (no ChatGPT / DeepSeek). */
export async function scanReceiptWithPaddleOcr(imageUri: string): Promise<PaddleScanResult> {
  const imageBase64 = await imageUriToBase64(imageUri, { forOcr: true });
  if (!imageBase64) {
    throw new Error(
      'Could not read the selected image. Try a JPG, PNG, or WebP photo under 25 MB.'
    );
  }

  const viaApi = await parseViaApi(imageBase64);
  if (viaApi) return viaApi;

  const viaDirect = await parseViaDirectPaddle(imageBase64);
  if (viaDirect) return viaDirect;

  throw new Error(
    'Receipt scanning is not available right now. Try again in a moment — the first scan can take 1–2 minutes while the service starts.'
  );
}
