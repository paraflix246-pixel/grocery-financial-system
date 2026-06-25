import { Platform } from 'react-native';

import type { ParsedReceiptDraft } from '@/src/models/types';
import {
  DEEPREAD_REQUEST_TIMEOUT_MS,
  type DeepReadScanResult,
} from '@/src/services/deepreadReceiptMapper';
import { imageUriToBase64 } from '@/src/services/receiptImageEncode';
import type { ReceiptScanStage } from '@/src/utils/scanWaitTime';

export type DeepReadScanProgress = {
  onStage?: (stage: ReceiptScanStage) => void;
};

function resolveDeepReadApiUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_RECEIPT_DEEPREAD_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/api/receipt-deepread`;
  }

  return null;
}

export function isDeepReadClientConfigured(): boolean {
  return resolveDeepReadApiUrl() != null;
}

let cachedServerConfigured: { value: boolean; checkedAt: number } | null = null;
const SERVER_CONFIGURED_CACHE_MS = 5 * 60 * 1000;

/** Web/native: ask the server proxy whether DEEPREAD_API_KEY is set. */
export async function fetchDeepReadServerConfigured(): Promise<boolean> {
  const apiUrl = resolveDeepReadApiUrl();
  if (!apiUrl) return false;

  if (
    cachedServerConfigured &&
    Date.now() - cachedServerConfigured.checkedAt < SERVER_CONFIGURED_CACHE_MS
  ) {
    return cachedServerConfigured.value;
  }

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) return false;
    const payload = (await response.json()) as { configured?: boolean };
    const value = payload.configured === true;
    cachedServerConfigured = { value, checkedAt: Date.now() };
    return value;
  } catch {
    return false;
  }
}

/** Client-side scan via our server proxy (keeps DEEPREAD_API_KEY off the client). */
export async function scanReceiptWithDeepRead(
  imageUri: string,
  progress?: DeepReadScanProgress
): Promise<DeepReadScanResult> {
  const apiUrl = resolveDeepReadApiUrl();
  if (!apiUrl) {
    throw new Error(
      'Receipt scanning is not set up. Set EXPO_PUBLIC_RECEIPT_DEEPREAD_API_URL or scan from the web app.'
    );
  }

  progress?.onStage?.('preparing');
  const imageBase64 = await imageUriToBase64(imageUri, { forOcr: true });
  if (!imageBase64) {
    throw new Error(
      'Could not read the selected image. Try a JPG, PNG, or WebP photo under 25 MB.'
    );
  }

  progress?.onStage?.('uploading');
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
    signal: AbortSignal.timeout(DEEPREAD_REQUEST_TIMEOUT_MS),
    connectTimeout: DEEPREAD_REQUEST_TIMEOUT_MS,
  } as RequestInit & { connectTimeout?: number });

  progress?.onStage?.('reading');

  if (!response.ok) {
    const errorBody = await response.text();
    console.warn('DeepRead API error:', response.status, errorBody);
    let apiError = 'DeepRead receipt scan failed. Please try again.';
    try {
      const parsed = JSON.parse(errorBody) as { error?: string };
      if (parsed.error) apiError = parsed.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(apiError);
  }

  progress?.onStage?.('extracting');
  const payload = (await response.json()) as {
    draft?: ParsedReceiptDraft;
    rawText?: string;
    parseVerified?: boolean;
    needsReview?: boolean;
    locationNeedsReview?: boolean;
    jobId?: string;
    previewUrl?: string;
    error?: string;
  };

  if (payload.error || !payload.draft) {
    throw new Error(payload.error ?? 'DeepRead returned no structured receipt data.');
  }

  return {
    draft: payload.draft,
    rawText: payload.rawText?.trim() ?? '',
    parseVerified: payload.parseVerified ?? true,
    needsReview: payload.needsReview ?? false,
    locationNeedsReview: payload.locationNeedsReview ?? false,
    jobId: payload.jobId ?? '',
    previewUrl: payload.previewUrl,
  };
}

export {
  DEEPREAD_API_BASE,
  DEEPREAD_PIPELINE,
  DEEPREAD_REQUEST_TIMEOUT_MS,
  mapDeepReadJobToDraft,
  RECEIPT_EXTRACTION_SCHEMA,
  type DeepReadExtractionField,
  type DeepReadJobResponse,
  type DeepReadScanResult,
} from '@/src/services/deepreadReceiptMapper';
