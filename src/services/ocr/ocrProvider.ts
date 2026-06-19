import { Platform } from 'react-native';

import { getAppSettings } from '@/src/services/storageService';

import { recognizeWithCloudVision } from './cloudVisionProvider';
import type { OcrRecognitionOptions, OcrRecognitionResult } from '../ocrTypes';
import { LOW_OCR_CONFIDENCE_THRESHOLD } from '../ocrTypes';

async function recognizeOnDevice(imageUri: string): Promise<OcrRecognitionResult> {
  if (Platform.OS === 'web') {
    const mod = await import('../onDeviceOcr.web');
    return mod.recognizeOnDeviceDetailed(imageUri);
  }
  const mod = await import('../onDeviceOcr.native');
  return mod.recognizeOnDeviceDetailed(imageUri);
}

function shouldTryCloud(
  onDevice: OcrRecognitionResult,
  enhancedCloudOcr: boolean
): boolean {
  if (!enhancedCloudOcr) return false;
  if (onDevice.source === 'empty') return true;
  if (onDevice.confidence != null && onDevice.confidence < LOW_OCR_CONFIDENCE_THRESHOLD) {
    return true;
  }
  if (Platform.OS === 'web' && onDevice.source === 'tesseract') {
    return onDevice.confidence == null || onDevice.confidence < 75;
  }
  return false;
}

function pickBestResult(
  onDevice: OcrRecognitionResult,
  cloud: OcrRecognitionResult | null
): OcrRecognitionResult {
  if (!cloud?.text) return onDevice;
  if (onDevice.source === 'empty') return cloud;

  const onDeviceScore = onDevice.confidence ?? (onDevice.text.length > 20 ? 60 : 30);
  const cloudScore = cloud.confidence ?? 80;
  return cloudScore >= onDeviceScore ? cloud : onDevice;
}

export async function recognizeTextFromImageDetailed(
  imageUri: string,
  options?: OcrRecognitionOptions
): Promise<OcrRecognitionResult> {
  const onDevice = await recognizeOnDevice(imageUri);

  let enhancedCloudOcr = options?.enhancedCloudOcr ?? false;
  if (options?.enhancedCloudOcr === undefined) {
    try {
      const settings = await getAppSettings();
      enhancedCloudOcr = settings.enhancedCloudOcr;
    } catch {
      enhancedCloudOcr = false;
    }
  }

  if (!shouldTryCloud(onDevice, enhancedCloudOcr)) {
    return onDevice;
  }

  const cloud = await recognizeWithCloudVision(imageUri);
  return pickBestResult(onDevice, cloud);
}

export async function recognizeTextFromImage(
  imageUri: string,
  options?: OcrRecognitionOptions
): Promise<string> {
  const result = await recognizeTextFromImageDetailed(imageUri, options);
  return result.text;
}
