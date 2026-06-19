export type {
  OcrRecognitionOptions,
  OcrRecognitionResult,
  OcrSource,
  OcrStructuredLine,
} from './ocrTypes';
export { LOW_OCR_CONFIDENCE_THRESHOLD } from './ocrTypes';
export {
  recognizeTextFromImage,
  recognizeTextFromImageDetailed,
} from './ocr/ocrProvider';
