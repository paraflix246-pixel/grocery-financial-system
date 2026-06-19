import { cleanOcrText } from '@/src/utils/textCleaner';

import type { OcrRecognitionResult, OcrStructuredLine } from './ocrTypes';

const MIN_TEXT_LENGTH = 12;

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

type MlKitLine = { text?: string; frame?: { top?: number } };
type MlKitBlock = { text?: string; lines?: MlKitLine[]; frame?: { top?: number } };

function extractStructuredLines(result: {
  blocks?: MlKitBlock[];
  text?: string;
}): OcrStructuredLine[] {
  const lines: OcrStructuredLine[] = [];

  if (result.blocks?.length) {
    for (const block of result.blocks) {
      if (block.lines?.length) {
        for (const line of block.lines) {
          const text = line.text?.trim();
          if (!text) continue;
          lines.push({ text, y: line.frame?.top ?? block.frame?.top });
        }
      } else if (block.text?.trim()) {
        lines.push({ text: block.text.trim(), y: block.frame?.top });
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

export async function recognizeOnDeviceDetailed(
  imageUri: string
): Promise<OcrRecognitionResult> {
  try {
    const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
    const result = await TextRecognition.recognize(imageUri);
    const structuredLines = extractStructuredLines(result);
    const text = linesToText(structuredLines);

    if (text.length >= MIN_TEXT_LENGTH && looksLikeReceiptText(text)) {
      return {
        text,
        source: 'mlkit',
        confidence: 85,
        structuredLines,
      };
    }

    if (text.length >= MIN_TEXT_LENGTH) {
      return {
        text,
        source: 'mlkit',
        confidence: 55,
        structuredLines,
      };
    }
  } catch (error) {
    console.warn('ML Kit OCR unavailable:', error);
  }

  return { text: '', source: 'empty', structuredLines: [] };
}
