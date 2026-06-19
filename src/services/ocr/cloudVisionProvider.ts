import { Platform } from 'react-native';

import type { OcrRecognitionResult } from '../ocrTypes';

const CLOUD_CONFIDENCE = 88;

async function imageUriToBase64(imageUri: string): Promise<string | null> {
  try {
    if (imageUri.startsWith('data:')) {
      const comma = imageUri.indexOf(',');
      return comma >= 0 ? imageUri.slice(comma + 1) : null;
    }

    const response = await fetch(imageUri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = String(reader.result ?? '');
        const comma = dataUrl.indexOf(',');
        resolve(comma >= 0 ? dataUrl.slice(comma + 1) : null);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to encode image for cloud OCR:', error);
    return null;
  }
}

function resolveOcrApiUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_OCR_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/api/ocr`;
  }

  return null;
}

export function isCloudOcrConfigured(): boolean {
  return resolveOcrApiUrl() != null;
}

export async function recognizeWithCloudVision(
  imageUri: string
): Promise<OcrRecognitionResult | null> {
  const apiUrl = resolveOcrApiUrl();
  if (!apiUrl) return null;

  const imageBase64 = await imageUriToBase64(imageUri);
  if (!imageBase64) return null;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });

    if (!response.ok) {
      console.warn('Cloud OCR request failed:', response.status);
      return null;
    }

    const payload = (await response.json()) as {
      text?: string;
      confidence?: number;
      structuredLines?: { text: string; y?: number }[];
      provider?: 'ocr_space' | 'cloud_vision';
      error?: string;
    };

    if (payload.error || !payload.text?.trim()) {
      return null;
    }

    const source = payload.provider === 'ocr_space' ? 'ocr_space' : 'cloud_vision';

    return {
      text: payload.text.trim(),
      source,
      confidence: payload.confidence ?? CLOUD_CONFIDENCE,
      structuredLines: payload.structuredLines,
    };
  } catch (error) {
    console.warn('Cloud OCR unavailable:', error);
    return null;
  }
}
