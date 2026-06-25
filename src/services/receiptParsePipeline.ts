import type { ParsedReceiptDraft } from '@/src/models/types';

import type { OcrRecognitionResult } from '@/src/services/ocrTypes';

import {
  fetchDeepReadServerConfigured,
  isDeepReadClientConfigured,
  scanReceiptWithDeepRead,
  type DeepReadScanProgress,
  type DeepReadScanResult,
} from '@/src/services/deepreadReceiptParse';
import { cleanupReceiptWithAi, isAiReceiptCleanupConfigured } from '@/src/services/receiptAiCleanup';
import { parseReceiptFromOcr } from '@/src/services/receiptParserStructured';
import {
  getReceiptAiCleanupReasons,
  shouldRunReceiptAiCleanup,
} from '@/src/utils/receiptAiCleanupGate';
import { validateParsedReceipt } from '@/src/utils/receiptValidation';
import type { ReceiptScanStage } from '@/src/utils/scanWaitTime';
import { savePriceRecords } from '@/src/services/communityPricingService';

export type ReceiptParseMethod = 'openai' | 'deepseek' | 'paddleocr' | 'deepread' | 'rules';

export type ScanReceiptOptions = DeepReadScanProgress & {
  onStage?: (stage: ReceiptScanStage) => void;
};

export type ScanReceiptResult = {
  draft: ParsedReceiptDraft;
  parseMethod: ReceiptParseMethod;
  ocrResult: OcrRecognitionResult;
  parseVerified?: boolean;
  deepseekAudited?: boolean;
  locationNeedsReview?: boolean;
};

export const DEEPREAD_CLIENT_NOT_CONFIGURED_ERROR =
  'Receipt scanning is not set up. Set EXPO_PUBLIC_RECEIPT_DEEPREAD_API_URL or scan from the web app.';

export const DEEPREAD_SERVER_NOT_CONFIGURED_ERROR =
  'DeepRead is not configured. Set DEEPREAD_API_KEY in .env and restart Expo.';

function deepReadToScanResult(
  deepReadResult: DeepReadScanResult,
  overrides?: Partial<ScanReceiptResult>
): ScanReceiptResult {
  return {
    draft: deepReadResult.draft,
    parseMethod: 'deepread',
    ocrResult: {
      text: deepReadResult.rawText,
      source: 'deepread',
    },
    parseVerified: deepReadResult.parseVerified,
    locationNeedsReview: deepReadResult.locationNeedsReview,
    ...overrides,
  };
}

async function maybeRefineDeepReadWithAi(
  deepReadResult: DeepReadScanResult,
  imageUri: string,
  options?: ScanReceiptOptions
): Promise<ScanReceiptResult> {
  const base = deepReadToScanResult(deepReadResult);

  const cleanupOptions = {
    draft: deepReadResult.draft,
    ocrText: deepReadResult.rawText,
    needsReview: deepReadResult.needsReview,
    parseVerified: deepReadResult.parseVerified,
  };

  if (!shouldRunReceiptAiCleanup(cleanupOptions)) {
    return base;
  }

  if (!isAiReceiptCleanupConfigured()) {
    return base;
  }

  options?.onStage?.('refining');

  const cleanupReasons = getReceiptAiCleanupReasons(cleanupOptions);
  const useVision =
    cleanupReasons.includes('missing_fee_line') ||
    cleanupReasons.includes('items_total_mismatch') ||
    cleanupReasons.includes('survey_junk');

  const cleaned = await cleanupReceiptWithAi({
    ocrText: deepReadResult.rawText,
    initialDraft: deepReadResult.draft,
    imageUri: useVision ? imageUri : null,
    textOnly: !useVision,
    doubleCheck: false,
  });

  if (!cleaned) {
    return base;
  }

  const warnings = validateParsedReceipt(cleaned.draft, { parseMethod: 'openai' });
  const parseVerified =
    cleaned.verified ??
    (warnings.length === 0 ||
      !warnings.some(
        (warning) =>
          warning === 'items_total_mismatch' ||
          warning === 'no_items' ||
          warning === 'no_total'
      ));

  return deepReadToScanResult(deepReadResult, {
    draft: cleaned.draft,
    parseMethod: cleaned.provider,
    parseVerified,
  });
}

/** @deprecated Use scanReceiptFromImage — DeepRead is the only scan path. */
export async function tryDeepReadScan(imageUri: string): Promise<ScanReceiptResult | null> {
  try {
    return await scanReceiptFromImage(imageUri);
  } catch {
    return null;
  }
}

/**
 * Receipt scan via DeepRead only. Throws when DeepRead is unavailable or the scan fails.
 */
export async function scanReceiptFromImage(
  imageUri: string,
  options?: ScanReceiptOptions
): Promise<ScanReceiptResult> {
  if (!isDeepReadClientConfigured()) {
    throw new Error(DEEPREAD_CLIENT_NOT_CONFIGURED_ERROR);
  }

  const serverConfigured = await fetchDeepReadServerConfigured();
  if (!serverConfigured) {
    throw new Error(DEEPREAD_SERVER_NOT_CONFIGURED_ERROR);
  }

  const deepReadResult = await scanReceiptWithDeepRead(imageUri, options);
  const result = await maybeRefineDeepReadWithAi(deepReadResult, imageUri, options);

  void savePriceRecords(
    result.draft.items ?? [],
    {
      storeName: result.draft.storeName,
      city: result.draft.storeCity ?? undefined,
      state: result.draft.storeRegion ?? undefined,
      zip: result.draft.storePostalCode ?? undefined,
    },
    result.draft.date
  );

  return result;
}

export function shouldOpenPreview(_result: ScanReceiptResult): boolean {
  return true;
}

/** @deprecated Use scanReceiptFromImage */
export async function parseReceiptFromScan(
  ocrResult: OcrRecognitionResult,
  imageUri?: string | null
): Promise<{ draft: ParsedReceiptDraft; parseMethod: ReceiptParseMethod }> {
  if (imageUri) {
    const scanned = await scanReceiptFromImage(imageUri);
    return { draft: scanned.draft, parseMethod: scanned.parseMethod };
  }

  return { draft: parseReceiptFromOcr(ocrResult), parseMethod: 'rules' };
}

/** @deprecated DeepRead is the only scan path — ML Kit is no longer used for receipt scans. */
export async function scanReceiptFromMlkit(_imageUri: string): Promise<ScanReceiptResult> {
  throw new Error('Receipt scans use DeepRead only. Configure EXPO_PUBLIC_RECEIPT_DEEPREAD_API_URL.');
}
