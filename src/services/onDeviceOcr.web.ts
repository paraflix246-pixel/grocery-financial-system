import { cleanOcrText } from '@/src/utils/textCleaner';

import type { OcrRecognitionResult, OcrStructuredLine } from './ocrTypes';

const MIN_TEXT_LENGTH = 12;
const MIN_RECEIPT_CONFIDENCE = 45;
const LOW_CONFIDENCE_THRESHOLD = 65;

function looksLikeReceiptText(text: string): boolean {
  const prices = text.match(/\d+\.\d{2}/g) ?? [];
  if (prices.length < 2) return false;
  const lower = text.toLowerCase();
  const hasSummary =
    lower.includes('total') ||
    lower.includes('subtotal') ||
    lower.includes('tax') ||
    lower.includes('amount due');
  return hasSummary || prices.length >= 3;
}

async function imageUriToDataUrl(imageUri: string): Promise<string> {
  if (imageUri.startsWith('data:')) return imageUri;

  const response = await fetch(imageUri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function preprocessReceiptImage(source: string): Promise<string> {
  if (typeof document === 'undefined') return source;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(2, Math.max(1, 1200 / Math.max(img.width, img.height)));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(source);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const { data } = imageData;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.35 + 128));
          const binary = contrast > 145 ? 255 : contrast < 95 ? 0 : contrast;
          data[i] = binary;
          data[i + 1] = binary;
          data[i + 2] = binary;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(source);
      }
    };
    img.onerror = () => resolve(source);
    img.src = source;
  });
}

function textToStructuredLines(text: string): OcrStructuredLine[] {
  return text
    .split('\n')
    .map((line, index) => ({ text: line.trim(), y: index }))
    .filter((line) => line.text.length > 0);
}

async function recognizeWithTesseractPsm(
  source: string,
  psm: number
): Promise<{ text: string; confidence: number; lines: OcrStructuredLine[] } | null> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
      await worker.setParameters({ tessedit_pageseg_mode: psm as never });
      const { data } = await worker.recognize(source);
      const cleaned = cleanOcrText(data.text.trim());
      const confidence = data.confidence ?? 0;
      const lines = textToStructuredLines(cleaned);

      if (cleaned.length < MIN_TEXT_LENGTH) return null;
      if (confidence < MIN_RECEIPT_CONFIDENCE && !looksLikeReceiptText(cleaned)) return null;
      if (!looksLikeReceiptText(cleaned) && confidence < LOW_CONFIDENCE_THRESHOLD) return null;

      return { text: cleaned, confidence, lines };
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.warn('Tesseract OCR failed:', error);
    return null;
  }
}

async function recognizeWithTesseract(
  imageUri: string
): Promise<{ text: string; confidence: number; lines: OcrStructuredLine[] } | null> {
  const rawSource =
    imageUri.startsWith('blob:') || imageUri.startsWith('data:')
      ? imageUri
      : await imageUriToDataUrl(imageUri);
  const source = await preprocessReceiptImage(rawSource);

  const { PSM } = await import('tesseract.js');
  const modes = [PSM.SINGLE_BLOCK, PSM.SINGLE_COLUMN, PSM.AUTO];
  let best: { text: string; confidence: number; lines: OcrStructuredLine[] } | null = null;

  for (const mode of modes) {
    const result = await recognizeWithTesseractPsm(source, Number(mode));
    if (!result) continue;
    if (!best || result.confidence > best.confidence) {
      best = result;
    }
    if (result.confidence >= 80 && looksLikeReceiptText(result.text)) break;
  }

  return best;
}

export async function recognizeOnDeviceDetailed(
  imageUri: string
): Promise<OcrRecognitionResult> {
  const result = await recognizeWithTesseract(imageUri);
  if (result) {
    return {
      text: result.text,
      source: 'tesseract',
      confidence: result.confidence,
      structuredLines: result.lines,
    };
  }

  return { text: '', source: 'empty', structuredLines: [] };
}
