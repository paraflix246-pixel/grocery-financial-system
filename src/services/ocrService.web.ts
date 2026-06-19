import { cleanOcrText } from '@/src/utils/textCleaner';

import type { OcrSource, OcrRecognitionResult } from './ocrTypes';

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

async function recognizeWithTesseract(
  imageUri: string
): Promise<{ text: string; confidence: number } | null> {
  try {
    const { createWorker, PSM } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });

      const rawSource =
        imageUri.startsWith('blob:') || imageUri.startsWith('data:')
          ? imageUri
          : await imageUriToDataUrl(imageUri);
      const source = await preprocessReceiptImage(rawSource);
      const { data } = await worker.recognize(source);
      const cleaned = cleanOcrText(data.text.trim());
      const confidence = data.confidence ?? 0;

      if (cleaned.length < MIN_TEXT_LENGTH) return null;
      if (confidence < MIN_RECEIPT_CONFIDENCE && !looksLikeReceiptText(cleaned)) return null;
      if (!looksLikeReceiptText(cleaned) && confidence < LOW_CONFIDENCE_THRESHOLD) return null;

      return { text: cleaned, confidence };
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.warn('Tesseract OCR failed:', error);
    return null;
  }
}

export async function recognizeTextFromImageDetailed(
  imageUri: string
): Promise<OcrRecognitionResult> {
  const result = await recognizeWithTesseract(imageUri);
  if (result) {
    return { text: result.text, source: 'tesseract', confidence: result.confidence };
  }

  return { text: '', source: 'empty' };
}

export async function recognizeTextFromImage(imageUri: string): Promise<string> {
  const result = await recognizeTextFromImageDetailed(imageUri);
  return result.text;
}
