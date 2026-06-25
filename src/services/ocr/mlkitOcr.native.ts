/**
 * On-device OCR via Google ML Kit (rn-mlkit-ocr).
 * Expo managed workflow + expo-dev-client + prebuild — not Bare, not Expo Go.
 * API: MlkitOcr.recognizeText(uri, 'latin') — not detectFromUri (archived react-native-mlkit-ocr).
 */
import MlkitOcr from 'rn-mlkit-ocr';

import type { OcrRecognitionResult, OcrStructuredLine } from '@/src/services/ocrTypes';
import { cleanOcrText } from '@/src/utils/textCleaner';

const MIN_TEXT_LENGTH = 12;

type MlkitLine = { text?: string; frame?: { y?: number } };
type MlkitBlock = { text?: string; lines?: MlkitLine[]; frame?: { y?: number } };

function looksLikeReceiptText(text: string): boolean {
  const prices = text.match(/\d+\.\d{2}/g) ?? [];
  if (prices.length < 2) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('total') ||
    lower.includes('subtotal') ||
    lower.includes('tax') ||
    lower.includes('amount due') ||
    prices.length >= 3
  );
}

function extractStructuredLines(result: { blocks?: MlkitBlock[]; text?: string }): OcrStructuredLine[] {
  const lines: OcrStructuredLine[] = [];

  if (result.blocks?.length) {
    for (const block of result.blocks) {
      if (block.lines?.length) {
        for (const line of block.lines) {
          const text = line.text?.trim();
          if (!text) continue;
          lines.push({ text, y: line.frame?.y ?? block.frame?.y });
        }
      } else if (block.text?.trim()) {
        lines.push({ text: block.text.trim(), y: block.frame?.y });
      }
    }
  }

  if (lines.length === 0 && result.text?.trim()) {
    return result.text
      .split('\n')
      .map((text) => ({ text: text.trim() }))
      .filter((line) => line.text.length > 0);
  }

  return lines.sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
}

function linesToText(lines: OcrStructuredLine[]): string {
  return cleanOcrText(lines.map((line) => line.text).join('\n').trim());
}

function confidenceForText(text: string): number {
  if (text.length >= MIN_TEXT_LENGTH && looksLikeReceiptText(text)) return 85;
  if (text.length >= MIN_TEXT_LENGTH) return 55;
  return 0;
}

/** Recognize receipt text from a local image URI using on-device ML Kit. */
export async function recognizeTextWithMlkit(imageUri: string): Promise<OcrRecognitionResult> {
  const result = await MlkitOcr.recognizeText(imageUri, 'latin');
  const structuredLines = extractStructuredLines(result);
  const text = linesToText(structuredLines);
  const confidence = confidenceForText(text);

  if (text.length < MIN_TEXT_LENGTH) {
    return { text: '', source: 'empty', structuredLines };
  }

  return {
    text,
    source: 'mlkit',
    confidence,
    structuredLines,
  };
}
