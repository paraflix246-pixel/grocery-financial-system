export type OcrSource =
  | 'mlkit'
  | 'tesseract'
  | 'ocr_space'
  | 'cloud_vision'
  | 'paddleocr'
  | 'deepread'
  | 'fallback'
  | 'empty';

export type OcrStructuredLine = {
  text: string;
  y?: number;
};

export type OcrRecognitionResult = {
  text: string;
  source: OcrSource;
  confidence?: number;
  structuredLines?: OcrStructuredLine[];
};

export type OcrRecognitionOptions = {
  enhancedCloudOcr?: boolean;
};

export const LOW_OCR_CONFIDENCE_THRESHOLD = 65;
