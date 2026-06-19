type OcrSpaceResponse = {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ParsedResults?: Array<{
    ParsedText?: string;
    FileParseExitCode?: number;
  }>;
};

export async function fetchOcrSpaceText(
  imageBase64: string,
  apiKey: string
): Promise<string | null> {
  const formData = new FormData();
  formData.append('apikey', apiKey);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
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
  if (payload.IsErroredOnProcessing || payload.OCRExitCode !== 1) {
    return null;
  }

  const text = payload.ParsedResults?.[0]?.ParsedText?.trim() ?? '';
  if (!text || payload.ParsedResults?.[0]?.FileParseExitCode !== 1) {
    return null;
  }

  return text;
}
