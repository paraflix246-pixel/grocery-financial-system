export type OcrSource = 'tesseract' | 'fallback' | 'empty';

export type OcrRecognitionResult = {
  text: string;
  source: OcrSource;
  confidence?: number;
};
