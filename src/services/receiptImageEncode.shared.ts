export const RECEIPT_IMAGE_MAX_BYTES = 25 * 1024 * 1024;
export const RECEIPT_IMAGE_MAX_DIMENSION = 4096;
/** OCR upload target — long receipt text stays readable at 2K JPEG. */
export const RECEIPT_OCR_MAX_DIMENSION = 2048;
export const RECEIPT_OCR_JPEG_QUALITY = 0.85;
export type ReceiptImageEncodeOptions = {
  maxDimension?: number;
  jpegQuality?: number;
};

const EXTENSION_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

export function dataUrlToBase64(dataUrl: string): string | null {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : null;
}

export function inferImageMimeType(file: Pick<File, 'name' | 'type'>): string | null {
  if (file.type.startsWith('image/')) {
    return file.type;
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[extension] ?? null;
}

export function isHeicMime(mime: string): boolean {
  return /heic|heif/i.test(mime);
}
