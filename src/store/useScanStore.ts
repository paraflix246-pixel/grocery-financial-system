import { create } from 'zustand';

import type { ParsedReceiptDraft } from '@/src/models/types';

type ScanStore = {
  imageUri: string | null;
  rawOcrText: string;
  draft: ParsedReceiptDraft | null;
  setImageUri: (uri: string) => void;
  setRawOcrText: (text: string) => void;
  setDraft: (draft: ParsedReceiptDraft) => void;
  updateDraft: (partial: Partial<ParsedReceiptDraft>) => void;
  updateDraftItem: (index: number, partial: Partial<ParsedReceiptDraft['items'][0]>) => void;
  addDraftItem: () => void;
  removeDraftItem: (index: number) => void;
  reset: () => void;
};

const emptyDraft = (): ParsedReceiptDraft => ({
  storeName: '',
  date: new Date().toISOString().split('T')[0],
  total: 0,
  items: [],
});

export const useScanStore = create<ScanStore>((set, get) => ({
  imageUri: null,
  rawOcrText: '',
  draft: null,

  setImageUri: (uri) => set({ imageUri: uri }),
  setRawOcrText: (text) => set({ rawOcrText: text }),
  setDraft: (draft) => set({ draft }),

  updateDraft: (partial) => {
    const draft = get().draft ?? emptyDraft();
    set({ draft: { ...draft, ...partial } });
  },

  updateDraftItem: (index, partial) => {
    const draft = get().draft;
    if (!draft) return;
    const items = draft.items.map((item, i) => (i === index ? { ...item, ...partial } : item));
    set({ draft: { ...draft, items } });
  },

  addDraftItem: () => {
    const draft = get().draft ?? emptyDraft();
    set({
      draft: {
        ...draft,
        items: [...draft.items, { name: 'New Item', price: 0, quantity: 1 }],
      },
    });
  },

  removeDraftItem: (index) => {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: { ...draft, items: draft.items.filter((_, i) => i !== index) } });
  },

  reset: () => set({ imageUri: null, rawOcrText: '', draft: null }),
}));
