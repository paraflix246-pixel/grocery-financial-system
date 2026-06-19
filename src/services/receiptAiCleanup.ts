import { Platform } from 'react-native';

import type { ParsedReceiptDraft } from '@/src/models/types';
import type { AiReceiptProvider } from '@/src/services/receiptAiPrompt';

export type ReceiptParseMethod = 'rules' | 'openai' | 'deepseek';

function dataUrlToBase64(dataUrl: string): string | null {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : null;
}

async function imageUriToDataUrl(imageUri: string): Promise<string | null> {
  try {
    if (imageUri.startsWith('data:')) {
      return imageUri;
    }

    const response = await fetch(imageUri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(String(reader.result ?? '') || null);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to encode image for AI receipt parse:', error);
    return null;
  }
}

async function imageUriToBase64(imageUri: string): Promise<string | null> {
  const dataUrl = await imageUriToDataUrl(imageUri);
  return dataUrl ? dataUrlToBase64(dataUrl) : null;
}

async function createReceiptImageSlices(imageUri: string): Promise<string[]> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return [];

  const dataUrl = await imageUriToDataUrl(imageUri);
  if (!dataUrl) return [];

  return await new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        if (image.height < 600) {
          resolve([]);
          return;
        }

        const sliceCount = image.height >= 1400 ? 5 : 4;
        const overlap = 0.12;
        const baseSliceHeight = image.height / sliceCount;
        const maxWidth = 1800;
        const scale = Math.min(1, maxWidth / image.width);
        const slices: string[] = [];

        for (let index = 0; index < sliceCount; index++) {
          const sourceY = Math.max(0, index * baseSliceHeight - baseSliceHeight * overlap);
          const sourceBottom = Math.min(
            image.height,
            (index + 1) * baseSliceHeight + baseSliceHeight * overlap
          );
          const sourceHeight = sourceBottom - sourceY;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(sourceHeight * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.drawImage(
            image,
            0,
            sourceY,
            image.width,
            sourceHeight,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const base64 = dataUrlToBase64(canvas.toDataURL('image/jpeg', 0.95));
          if (base64) slices.push(base64);
        }

        resolve(slices);
      } catch {
        resolve([]);
      }
    };
    image.onerror = () => resolve([]);
    image.src = dataUrl;
  });
}

function resolveReceiptParseApiUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_RECEIPT_PARSE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/api/receipt-parse`;
  }

  return null;
}

export function isAiReceiptCleanupConfigured(): boolean {
  return resolveReceiptParseApiUrl() != null;
}

export async function cleanupReceiptWithAi(options: {
  ocrText: string;
  initialDraft: ParsedReceiptDraft;
  imageUri?: string | null;
  doubleCheck?: boolean;
}): Promise<{ draft: ParsedReceiptDraft; provider: AiReceiptProvider; verified?: boolean } | null> {
  const apiUrl = resolveReceiptParseApiUrl();
  if (!apiUrl) return null;

  const imageBase64 = options.imageUri ? await imageUriToBase64(options.imageUri) : null;
  const imageBase64Segments = options.imageUri
    ? await createReceiptImageSlices(options.imageUri)
    : [];

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ocrText: options.ocrText,
        initialDraft: options.initialDraft,
        imageBase64,
        imageBase64Segments,
        doubleCheck: options.doubleCheck !== false,
      }),
    });

    if (!response.ok) {
      console.warn('AI receipt cleanup request failed:', response.status);
      return null;
    }

    const payload = (await response.json()) as {
      draft?: ParsedReceiptDraft;
      provider?: AiReceiptProvider;
      verified?: boolean;
      error?: string;
    };

    if (payload.error || !payload.draft) {
      return null;
    }

    return {
      draft: payload.draft,
      provider: payload.provider ?? 'openai',
      verified: payload.verified,
    };
  } catch (error) {
    console.warn('AI receipt cleanup unavailable:', error);
    return null;
  }
}
