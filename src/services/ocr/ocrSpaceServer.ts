import type { OcrLine, OcrOverlay, OcrWord } from '@/src/services/ocr/ocrOverlayTypes';

export type { OcrLine, OcrOverlay, OcrWord } from '@/src/services/ocr/ocrOverlayTypes';

type OcrSpaceResponse = {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ParsedResults?: Array<{
    ParsedText?: string;
    FileParseExitCode?: number;
    TextOverlay?: {
      Lines?: Array<{
        Words?: Array<{
          WordText?: string;
          Left?: number;
          Top?: number;
          Width?: number;
          Height?: number;
        }>;
        MinTop?: number;
      }>;
      HasOverlay?: boolean;
    };
  }>;
};

/**
 * Calls OCR.space with word-level overlay enabled.
 * Returns both the raw text and structured word-level lines so the caller
 * can do spatial line reconstruction (price anchoring, truncation detection)
 * without making a second API call.
 */
export async function fetchOcrSpaceOverlay(
  imageBase64: string,
  apiKey: string
): Promise<OcrOverlay | null> {
  const formData = new FormData();
  formData.append('apikey', apiKey);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'true');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');
  formData.append('base64Image', `data:image/jpeg;base64,${imageBase64}`);

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    console.warn('OCR.space error:', response.status);
    return null;
  }

  const payload = (await response.json()) as OcrSpaceResponse;
  if (payload.IsErroredOnProcessing || payload.OCRExitCode !== 1) return null;

  const result = payload.ParsedResults?.[0];
  if (!result || result.FileParseExitCode !== 1) return null;

  const rawText = result.ParsedText?.trim() ?? '';

  const lines: OcrLine[] = (result.TextOverlay?.Lines ?? [])
    .map((line) => ({
      top: line.MinTop ?? 0,
      words: (line.Words ?? [])
        .filter((w) => w.WordText?.trim())
        .map((w) => ({
          text: w.WordText!.trim(),
          left: w.Left ?? 0,
          top: w.Top ?? 0,
          width: w.Width ?? 0,
          height: w.Height ?? 0,
        })),
    }))
    .filter((line) => line.words.length > 0)
    .sort((a, b) => a.top - b.top);

  return { rawText, lines };
}

/** Backward-compatible helper used by code that only needs the raw text. */
export async function fetchOcrSpaceText(
  imageBase64: string,
  apiKey: string
): Promise<string | null> {
  const overlay = await fetchOcrSpaceOverlay(imageBase64, apiKey);
  return overlay?.rawText ?? null;
}
