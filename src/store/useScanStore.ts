import { create } from 'zustand';

import type { ParsedReceiptDraft, Receipt } from '@/src/models/types';
import type { OcrSource } from '@/src/services/ocrTypes';
import type { ReceiptParseWarning } from '@/src/utils/receiptValidation';
import { normalizeReceiptTotalsForSave } from '@/src/utils/receiptTotals';

type ScanStore = {
  imageUri: string | null;
  rawOcrText: string;
  draft: ParsedReceiptDraft | null;
  editingReceiptId: string | null;
  ocrSource: OcrSource | null;
  ocrConfidence: number | null;
  parseWarnings: ReceiptParseWarning[];
  setImageUri: (uri: string) => void;
  setRawOcrText: (text: string) => void;
  setOcrMeta: (meta: { source: OcrSource; confidence?: number }) => void;
  setParseWarnings: (warnings: ReceiptParseWarning[]) => void;
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

function withSyncedTotals(draft: ParsedReceiptDraft): ParsedReceiptDraft {
  const totals = normalizeReceiptTotalsForSave(draft.items, draft.tax);
  return { ...draft, ...totals };
}

export const useScanStore = create<ScanStore>((set, get) => ({
  imageUri: null,
  rawOcrText: '',
  draft: null,
  editingReceiptId: null,
  ocrSource: null,
  ocrConfidence: null,
  parseWarnings: [],

  setImageUri: (uri) => set({ imageUri: uri }),
  setRawOcrText: (text) => set({ rawOcrText: text }),
  setOcrMeta: ({ source, confidence }) =>
    set({ ocrSource: source, ocrConfidence: confidence ?? null }),
  setParseWarnings: (warnings) => set({ parseWarnings: warnings }),
  setDraft: (draft) => set({ draft: withSyncedTotals(draft), editingReceiptId: null }),

  loadReceiptForEdit: (receipt) =>
    set({
      editingReceiptId: receipt.id,
      imageUri: receipt.imageUri || null,
      rawOcrText: '',
      ocrSource: null,
      ocrConfidence: null,
      parseWarnings: [],
      draft: withSyncedTotals({
        storeName: receipt.storeName,
        date: receipt.date,
        subtotal: receipt.subtotal,
        tax: receipt.tax,
        total: receipt.total,
        items: (receipt.items ?? []).map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      }),
    }),

  updateDraft: (partial) => {
    const draft = get().draft ?? emptyDraft();
    const next = { ...draft, ...partial };
    set({ draft: 'tax' in partial ? withSyncedTotals(next) : next });
  },

  updateDraftItem: (index, partial) => {
    const draft = get().draft;
    if (!draft) return;
    const items = draft.items.map((item, i) => (i === index ? { ...item, ...partial } : item));
    set({ draft: withSyncedTotals({ ...draft, items }) });
  },

  addDraftItem: () => {
    const draft = get().draft ?? emptyDraft();
    set({
      draft: withSyncedTotals({
        ...draft,
        items: [...draft.items, { name: 'New Item', price: 0, quantity: 1 }],
      }),
    });
  },

  removeDraftItem: (index) => {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: withSyncedTotals({ ...draft, items: draft.items.filter((_, i) => i !== index) }) });
  },

  reset: () =>
    set({
      imageUri: null,
      rawOcrText: '',
      draft: null,
      editingReceiptId: null,
      ocrSource: null,
      ocrConfidence: null,
      parseWarnings: [],
    }),

  startManualEntry: () =>
    set({
      imageUri: null,
      rawOcrText: '',
      editingReceiptId: null,
      ocrSource: null,
      ocrConfidence: null,
      parseWarnings: [],
      draft: emptyDraft(),
    }),
}));
