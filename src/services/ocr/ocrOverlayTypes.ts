export type OcrWord = {
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type OcrLine = {
  words: OcrWord[];
  top: number;
};

export type OcrOverlay = {
  /** Raw concatenated text (for store/date/totals parsing). */
  rawText: string;
  /** Word-level layout lines (for spatial item reconstruction). */
  lines: OcrLine[];
};

export type OcrOverlayProvider = 'paddleocr' | 'ocrspace' | 'none';
