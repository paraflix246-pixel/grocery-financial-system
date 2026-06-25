export {
  RECEIPT_IMAGE_MAX_BYTES,
  RECEIPT_IMAGE_MAX_DIMENSION,
  RECEIPT_OCR_JPEG_QUALITY,
  RECEIPT_OCR_MAX_DIMENSION,
  dataUrlToBase64,
  inferImageMimeType,
  isHeicMime,
  type ReceiptImageEncodeOptions,
} from '@/src/services/receiptImageEncode.shared';

import {
  RECEIPT_IMAGE_MAX_BYTES,
  RECEIPT_IMAGE_MAX_DIMENSION,
  RECEIPT_OCR_JPEG_QUALITY,
  RECEIPT_OCR_MAX_DIMENSION,
  dataUrlToBase64,
  inferImageMimeType,
  isHeicMime,
  type ReceiptImageEncodeOptions,
} from '@/src/services/receiptImageEncode.shared';

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.startsWith('data:')) {
        reject(new Error('Could not read the selected image.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
  });
}

function resizeReceiptDataUrl(
  dataUrl: string,
  options?: ReceiptImageEncodeOptions
): Promise<string> {
  const maxDimension = options?.maxDimension ?? RECEIPT_IMAGE_MAX_DIMENSION;
  const jpegQuality = options?.jpegQuality ?? 0.92;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', jpegQuality));
      } catch {
        resolve(dataUrl);
      }
    };
    image.onerror = () => {
      reject(
        new Error(
          'This image format is not supported in your browser. Save the photo as JPG or PNG and try again.'
        )
      );
    };
    image.src = dataUrl;
  });
}

export async function normalizeReceiptImageDataUrl(
  dataUrl: string,
  options?: ReceiptImageEncodeOptions
): Promise<string> {
  if (typeof document === 'undefined') {
    return dataUrl;
  }

  return resizeReceiptDataUrl(dataUrl, options);
}

/** Compress and downscale before OCR / network upload. */
export async function prepareReceiptImageForOcr(dataUrl: string): Promise<string> {
  return normalizeReceiptImageDataUrl(dataUrl, {
    maxDimension: RECEIPT_OCR_MAX_DIMENSION,
    jpegQuality: RECEIPT_OCR_JPEG_QUALITY,
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  const mime = inferImageMimeType(file);
  if (!mime) {
    throw new Error('Unsupported file type. Choose a JPG, PNG, or WebP receipt photo.');
  }
  if (isHeicMime(mime)) {
    throw new Error(
      'HEIC photos are not supported in the browser. Save or export the photo as JPG or PNG and try again.'
    );
  }
  if (file.size > RECEIPT_IMAGE_MAX_BYTES) {
    throw new Error(
      `Image is too large (${Math.round(file.size / 1024 / 1024)} MB). Use a photo under ${RECEIPT_IMAGE_MAX_BYTES / 1024 / 1024} MB.`
    );
  }

  const dataUrl = await readFileAsDataUrl(file);
  return await prepareReceiptImageForOcr(dataUrl);
}

export async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const base64 = dataUrlToBase64(dataUrl);
  if (!base64) {
    throw new Error('Could not encode the selected image.');
  }
  return base64;
}

async function uriToDataUrl(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not read image (${response.status})`);
  }

  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function compressReceiptImageUriNative(
  imageUri: string,
  options?: ReceiptImageEncodeOptions
): Promise<string> {
  const ImageManipulator = await import('expo-image-manipulator');
  const { Image } = await import('react-native');

  const maxDimension = options?.maxDimension ?? RECEIPT_OCR_MAX_DIMENSION;
  const jpegQuality = options?.jpegQuality ?? RECEIPT_OCR_JPEG_QUALITY;

  const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(
      imageUri,
      (w, h) => resolve({ width: w, height: h }),
      (error) => reject(error ?? new Error('Could not read image dimensions.'))
    );
  });

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const resize =
    scale < 1
      ? {
          width: Math.max(1, Math.round(width * scale)),
          height: Math.max(1, Math.round(height * scale)),
        }
      : undefined;

  const manipulated = await ImageManipulator.manipulateAsync(
    imageUri,
    resize ? [{ resize }] : [],
    {
      compress: jpegQuality,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return manipulated.uri;
}

export async function imageUriToBase64(
  imageUri: string,
  options?: { forOcr?: boolean }
): Promise<string | null> {
  try {
    const isWeb = typeof document !== 'undefined';

    if (options?.forOcr) {
      if (isWeb) {
        const dataUrl = imageUri.startsWith('data:') ? imageUri : await uriToDataUrl(imageUri);
        return dataUrlToBase64(await prepareReceiptImageForOcr(dataUrl));
      }

      const compressedUri = await compressReceiptImageUriNative(imageUri);
      return dataUrlToBase64(await uriToDataUrl(compressedUri));
    }

    if (isWeb) {
      const dataUrl = imageUri.startsWith('data:') ? imageUri : await uriToDataUrl(imageUri);
      return dataUrlToBase64(await normalizeReceiptImageDataUrl(dataUrl));
    }

    const dataUrl = imageUri.startsWith('data:') ? imageUri : await uriToDataUrl(imageUri);
    return dataUrlToBase64(dataUrl);
  } catch (error) {
    console.warn('Failed to encode receipt image:', error);
    return null;
  }
}
