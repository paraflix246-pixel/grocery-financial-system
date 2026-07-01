import { create } from 'zustand';

import type { ParsedReceiptDraft, Receipt } from '@/src/models/types';
import type { OcrSource } from '@/src/services/ocrTypes';
import type { ReceiptParseMethod } from '@/src/services/receiptParsePipeline';
import type { ReceiptStorageSessionChoice } from '@/src/services/privacyPreferencesService';
import type { ReceiptParseWarning } from '@/src/utils/receiptValidation';
import {
  inferFooterTripleFromItems,
  resolvePrintedTotals,
} from '@/src/utils/receiptDraftNormalizer';
import { computeReceiptTotals } from '@/src/utils/receiptTotals';
import { normalizeStoreLocation } from '@/src/utils/storeLocationParser';

type ScanStore = {
  imageUri: string | null;
  rawOcrText: string;
  draft: ParsedReceiptDraft | null;
  editingReceiptId: string | null;
  ocrSource: OcrSource | null;
  ocrConfidence: number | null;
  parseMethod: ReceiptParseMethod | null;
  parseVerified: boolean;
  deepseekAudited: boolean;
  parseWarnings: ReceiptParseWarning[];
  /** Scan image URI we already showed the rescan prompt for (once per photo). */
  rescanPromptImageUri: string | null;
  locationNeedsReview: boolean;
  receiptStorageChoice: ReceiptStorageSessionChoice | null;
  rememberStorageChoice: boolean;
  setLocationNeedsReview: (value: boolean) => void;
  setReceiptStorageChoice: (choice: ReceiptStorageSessionChoice | null) => void;
  setRememberStorageChoice: (remember: boolean) => void;
  setImageUri: (uri: string) => void;
  setRawOcrText: (text: string) => void;
  setOcrMeta: (meta: {
    source: OcrSource;
    confidence?: number;
    parseMethod?: ReceiptParseMethod;
    parseVerified?: boolean;
    deepseekAudited?: boolean;
  }) => void;
  setParseWarnings: (warnings: ReceiptParseWarning[]) => void;
  markRescanPromptShown: (imageUri: string) => void;
  setDraft: (draft: ParsedReceiptDraft) => void;
  loadReceiptForEdit: (receipt: Receipt) => void;
  updateDraft: (partial: Partial<ParsedReceiptDraft>) => void;
  updateDraftItem: (index: number, partial: Partial<ParsedReceiptDraft['items'][0]>) => void;
  addDraftItem: () => void;
  removeDraftItem: (index: number) => void;
  reset: () => void;
  startManualEntry: () => void;
};

const emptyDraft = (): ParsedReceiptDraft => ({
  storeName: '',
  date: new Date().toISOString().split('T')[0],
  total: 0,
  items: [],
});

const LOCATION_KEYS = [
  'storeAddress',
  'storeCity',
  'storeRegion',
  'storePostalCode',
  'storeCountry',
] as const;

function withNormalizedLocation(draft: ParsedReceiptDraft): ParsedReceiptDraft {
  const normalized = normalizeStoreLocation(draft);
  return { ...draft, ...normalized };
}

function withSyncedTotals(draft: ParsedReceiptDraft, ocrText?: string): ParsedReceiptDraft {
  const fromItems = inferFooterTripleFromItems(draft.items);
  let subtotal = fromItems?.subtotal ?? draft.subtotal;
  let tax = fromItems?.tax ?? draft.tax;
  let total = fromItems?.total ?? draft.total;

  if (ocrText?.trim()) {
    const printed = resolvePrintedTotals(
      { ...draft, subtotal, tax, total },
      ocrText,
      null
    );
    if (printed.total > 0) {
      subtotal = printed.subtotal;
      tax = printed.tax;
      total = printed.total;
    }
  }

  const totals = computeReceiptTotals({
    items: draft.items,
    subtotal,
    tax,
    total,
  });
  return { ...draft, ...totals };
}

function finalizeDraft(draft: ParsedReceiptDraft, ocrText?: string): ParsedReceiptDraft {
  return withNormalizedLocation(withSyncedTotals(draft, ocrText));
}

export const useScanStore = create<ScanStore>((set, get) => ({
  imageUri: null,
  rawOcrText: '',
  draft: null,
  editingReceiptId: null,
  ocrSource: null,
  ocrConfidence: null,
  parseMethod: null,
  parseVerified: false,
  deepseekAudited: false,
  parseWarnings: [],
  rescanPromptImageUri: null,
  locationNeedsReview: false,
  receiptStorageChoice: null,
  rememberStorageChoice: false,
  setImageUri: (uri) => set({ imageUri: uri, rescanPromptImageUri: null }),
  setRawOcrText: (text) => set({ rawOcrText: text }),
  setOcrMeta: ({ source, confidence, parseMethod, parseVerified, deepseekAudited }) =>
    set({
      ocrSource: source,
      ocrConfidence: confidence ?? null,
      parseMethod: parseMethod ?? null,
      parseVerified: parseVerified ?? false,
      deepseekAudited: deepseekAudited ?? false,
    }),
  setParseWarnings: (warnings) => set({ parseWarnings: warnings }),
  setLocationNeedsReview: (locationNeedsReview) => set({ locationNeedsReview }),
  setReceiptStorageChoice: (receiptStorageChoice) => set({ receiptStorageChoice }),
  setRememberStorageChoice: (rememberStorageChoice) => set({ rememberStorageChoice }),
  markRescanPromptShown: (imageUri) => set({ rescanPromptImageUri: imageUri }),
  setDraft: (draft) =>
    set({ draft: finalizeDraft(draft, get().rawOcrText), editingReceiptId: null }),

  loadReceiptForEdit: (receipt) =>
    set({
      editingReceiptId: receipt.id,
      imageUri: receipt.imageUri || null,
      rawOcrText: '',
      ocrSource: null,
      ocrConfidence: null,
      parseMethod: null,
      parseVerified: false,
      deepseekAudited: false,
      parseWarnings: [],
      rescanPromptImageUri: null,
      locationNeedsReview: false,
      draft: finalizeDraft({
        storeName: receipt.storeName,
        date: receipt.date,
        subtotal: receipt.subtotal,
        tax: receipt.tax,
        total: receipt.total,
        storeAddress: receipt.storeAddress,
        storeCity: receipt.storeCity,
        storeRegion: receipt.storeRegion,
        storePostalCode: receipt.storePostalCode,
        storeCountry: receipt.storeCountry,
        items: (receipt.items ?? []).map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unit: item.unit,
        })),
      }),
    }),

  updateDraft: (partial) => {
    const draft = get().draft ?? emptyDraft();
    const next = { ...draft, ...partial };
    const touchesLocation = LOCATION_KEYS.some((key) => key in partial);
    const synced = 'tax' in partial ? withSyncedTotals(next) : next;
    set({ draft: touchesLocation ? withNormalizedLocation(synced) : synced });
  },

  updateDraftItem: (index, partial) => {
    const draft = get().draft;
    if (!draft) return;
    const items = draft.items.map((item, i) => (i === index ? { ...item, ...partial } : item));
    set({ draft: finalizeDraft({ ...draft, items }, get().rawOcrText) });
  },

  addDraftItem: () => {
    const draft = get().draft ?? emptyDraft();
    set({
      draft: finalizeDraft({
        ...draft,
        items: [...draft.items, { name: 'New Item', price: 0, quantity: 1 }],
      }),
    });
  },

  removeDraftItem: (index) => {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: finalizeDraft({ ...draft, items: draft.items.filter((_, i) => i !== index) }) });
  },

  reset: () =>
    set({
      imageUri: null,
      rawOcrText: '',
      draft: null,
      editingReceiptId: null,
      ocrSource: null,
      ocrConfidence: null,
      parseMethod: null,
      parseVerified: false,
      deepseekAudited: false,
      parseWarnings: [],
      rescanPromptImageUri: null,
      locationNeedsReview: false,
      receiptStorageChoice: null,
      rememberStorageChoice: false,
    }),

  startManualEntry: () =>
    set({
      imageUri: null,
      rawOcrText: '',
      editingReceiptId: null,
      ocrSource: null,
      ocrConfidence: null,
      parseMethod: null,
      parseVerified: false,
      deepseekAudited: false,
      parseWarnings: [],
      rescanPromptImageUri: null,
      locationNeedsReview: false,
      receiptStorageChoice: null,
      rememberStorageChoice: false,
      draft: emptyDraft(),
    }),
}));
