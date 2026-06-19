import type { ParsedReceiptDraft } from '@/src/models/types';
import { recognizeTextFromImageDetailed } from '@/src/services/ocrService';
import type { OcrRecognitionResult } from '@/src/services/ocrTypes';
import { parseReceiptFromOcr } from '@/src/services/receiptParserStructured';
import { getAppSettings } from '@/src/services/storageService';

import { cleanupReceiptWithAi, type ReceiptParseMethod } from './receiptAiCleanup';

export type ScanReceiptResult = {
  draft: ParsedReceiptDraft;
  parseMethod: ReceiptParseMethod;
  ocrResult: OcrRecognitionResult;
  parseVerified?: boolean;
};

function emptyDraft(): ParsedReceiptDraft {
  return {
    storeName: '',
    date: new Date().toISOString().split('T')[0],
    total: 0,
    items: [],
  };
}

function isUsableDraft(draft: ParsedReceiptDraft): boolean {
  return draft.items.length > 0 && draft.total > 0;
}

async function isAiScanEnabled(): Promise<boolean> {
  try {
    const settings = await getAppSettings();
    return settings.aiReceiptCleanup;
  } catch {
    return true;
  }
}

/** Scan receipt image via ChatGPT API first; fall back to OCR + rules if API fails. */
export async function scanReceiptFromImage(imageUri: string): Promise<ScanReceiptResult> {
  const aiEnabled = await isAiScanEnabled();

  if (aiEnabled) {
    const apiResult = await cleanupReceiptWithAi({
      ocrText: '',
      initialDraft: emptyDraft(),
      imageUri,
    });

    if (apiResult && isUsableDraft(apiResult.draft)) {
      return {
        draft: apiResult.draft,
        parseMethod: apiResult.provider,
        ocrResult: { text: '', source: 'empty' },
        parseVerified: apiResult.verified,
      };
    }
  }

  const ocrResult = await recognizeTextFromImageDetailed(imageUri);
  const rulesDraft = parseReceiptFromOcr(ocrResult);

  if (aiEnabled) {
    const apiResult = await cleanupReceiptWithAi({
      ocrText: ocrResult.text,
      initialDraft: rulesDraft,
      imageUri,
    });

    if (apiResult && isUsableDraft(apiResult.draft)) {
      return {
        draft: apiResult.draft,
        parseMethod: apiResult.provider,
        ocrResult,
        parseVerified: apiResult.verified,
      };
    }
  }

  return {
    draft: rulesDraft,
    parseMethod: 'rules',
    ocrResult,
  };
}

export function shouldOpenPreview(result: ScanReceiptResult): boolean {
  if (result.parseMethod === 'openai' || result.parseMethod === 'deepseek') {
    return true;
  }
  if (result.ocrResult.source === 'empty') {
    return result.draft.items.length > 0;
  }
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

  const rulesDraft = parseReceiptFromOcr(ocrResult);
  const aiEnabled = await isAiScanEnabled();

  if (!aiEnabled || !ocrResult.text.trim()) {
    return { draft: rulesDraft, parseMethod: 'rules' };
  }

  const apiResult = await cleanupReceiptWithAi({
    ocrText: ocrResult.text,
    initialDraft: rulesDraft,
    imageUri,
  });

  if (apiResult) {
    return { draft: apiResult.draft, parseMethod: apiResult.provider };
  }

  return { draft: rulesDraft, parseMethod: 'rules' };
}
