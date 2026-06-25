import type { ParsedReceiptDraft } from '@/src/models/types';
import { normalizeReceiptDate } from '@/src/utils/dateParser';
import { normalizeUnitLabel } from '@/src/utils/unitPriceParser';
import { finalizeReceiptDraft, HIDDEN_ITEM_NAME } from '@/src/utils/receiptDraftNormalizer';
import { looksLikeSurveyHeaderJunk } from '@/src/utils/receiptHeaderFilter';
import { classifyReceiptLineKind } from '@/src/utils/receiptMerchandiseFilter';
import { parseReceiptText } from '@/src/services/receiptParser';
import { mergeStoreLocation, normalizeStoreLocation } from '@/src/utils/storeLocationParser';

export const DEEPREAD_API_BASE = 'https://api.deepread.tech';
/** Server submit + poll budget (client HTTP timeout matches this). */
export const DEEPREAD_REQUEST_TIMEOUT_MS = 240_000;
/** `fast` is much quicker than `standard` for receipt photos; accuracy remains good for review. */
export const DEEPREAD_PIPELINE = 'fast';

export const RECEIPT_EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    store_name: {
      type: 'string',
      description: 'Store or merchant name printed on the receipt (e.g. Walmart, Target).',
    },
    store_address: {
      type: 'string',
      description: 'Full store street address as printed on the receipt header.',
    },
    store_city: { type: 'string', description: 'City from the store address.' },
    store_region: {
      type: 'string',
      description: 'US state or Canadian province code (e.g. TX, ON).',
    },
    store_postal_code: { type: 'string', description: 'ZIP or postal code from the store address.' },
    store_country: {
      type: 'string',
      description: 'Country code when visible: US or CA.',
    },
    date: {
      type: 'string',
      description: 'Transaction date in YYYY-MM-DD format when visible.',
    },
    subtotal: {
      type: 'number',
      description: 'Subtotal before tax, excluding line-item discounts rolled into subtotal.',
    },
    tax: {
      type: 'number',
      description: 'Sales tax amount.',
    },
    total: {
      type: 'number',
      description: 'Grand total amount paid.',
    },
    items: {
      type: 'array',
      description:
        'Every visible priced line on the receipt before the subtotal footer: products, payment fees (e.g. CHARGE PYMT), and any other priced rows. Exclude only subtotal, tax, and total footer lines.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Line text as printed on the receipt.' },
          price: { type: 'number', description: 'Line item price in dollars.' },
          quantity: { type: 'number', description: 'Quantity purchased; use 1 when not shown.' },
          unit_price: { type: 'number', description: 'Unit price when printed (e.g. per lb).' },
          unit: { type: 'string', description: 'Unit label: lb, oz, ea, L, gal, kg, g.' },
        },
        required: ['name', 'price'],
      },
    },
    store_number: {
      type: 'string',
      description: 'Store number when printed (e.g. 3156 from "STORE 3156").',
    },
  },
  required: ['store_name', 'total', 'items'],
} as const;

export type DeepReadExtractionField = {
  key: string;
  value: unknown;
  needs_review?: boolean;
  review_reason?: string;
  location?: { page?: number };
};

export type DeepReadJobResponse = {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
  document?: {
    page_count?: number;
    content?: {
      format?: string;
      text?: string;
      text_preview?: string;
    };
  };
  extraction?: {
    fields?: DeepReadExtractionField[];
  };
  review?: {
    needs_review?: boolean;
    review_rate?: number;
    fields_needing_review?: number;
  };
};

export type DeepReadScanResult = {
  draft: ParsedReceiptDraft;
  rawText: string;
  parseVerified: boolean;
  needsReview: boolean;
  locationNeedsReview: boolean;
  jobId: string;
  previewUrl?: string;
};

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value == null) return '';
  return String(value).trim();
}

function extractionFieldMap(fields: DeepReadExtractionField[] | undefined): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const field of fields ?? []) {
    map[field.key] = field.value;
  }
  return map;
}

function mapLineItems(raw: unknown): ParsedReceiptDraft['items'] {
  if (!Array.isArray(raw)) return [];

  return raw
    .flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Record<string, unknown>;
      let name = asString(item.name ?? item.description);
      const price = asNumber(item.price ?? item.amount);
      if (!name || price == null || price <= 0) return [];
      if (looksLikeSurveyHeaderJunk(name)) {
        name = HIDDEN_ITEM_NAME;
      }
      const quantity = asNumber(item.quantity) ?? 1;
      const unitPrice = asNumber(item.unit_price ?? item.unitPrice);
      const unit = normalizeUnitLabel(asString(item.unit) ?? undefined);
      const lineKind = classifyReceiptLineKind(name);
      return [
        {
          name,
          price,
          quantity: quantity > 0 ? quantity : 1,
          ...(lineKind !== 'merchandise' ? { lineKind } : {}),
          ...(unitPrice != null && unitPrice > 0 ? { unitPrice } : {}),
          ...(unit ? { unit } : {}),
        },
      ];
    });
}

export function mapDeepReadJobToDraft(job: DeepReadJobResponse): DeepReadScanResult | null {
  if (job.status !== 'completed') return null;

  const rawText = job.document?.content?.text?.trim() ?? '';
  const fields = extractionFieldMap(job.extraction?.fields);
  const items = mapLineItems(fields.items);
  const storeName = asString(fields.store_name) || 'Unknown Store';
  const storeNumber = asString(fields.store_number) || undefined;
  const dateRaw = asString(fields.date);
  const date = dateRaw ? normalizeReceiptDate(dateRaw) : new Date().toISOString().split('T')[0];
  const subtotal = asNumber(fields.subtotal);
  const tax = asNumber(fields.tax);
  const total = asNumber(fields.total) ?? 0;

  const storeLocation = normalizeStoreLocation(
    mergeStoreLocation(
      {
        storeAddress: asString(fields.store_address) || undefined,
        storeCity: asString(fields.store_city) || undefined,
        storeRegion: asString(fields.store_region) || undefined,
        storePostalCode: asString(fields.store_postal_code) || undefined,
        storeCountry: asString(fields.store_country) || undefined,
      },
      null
    )
  );

  const initialDraft: ParsedReceiptDraft = {
    storeName,
    date,
    storeNumber,
    subtotal,
    tax,
    total,
    items,
    ...storeLocation,
  };

  const ocrDraft = rawText.trim() ? parseReceiptText(rawText) : initialDraft;
  const draft = finalizeReceiptDraft(initialDraft, rawText, ocrDraft);
  const locationNeedsReview =
    job.extraction?.fields?.some(
      (field) =>
        field.needs_review &&
        ['store_address', 'store_region', 'store_postal_code', 'store_city'].includes(field.key)
    ) ?? false;
  const criticalReview =
    job.extraction?.fields?.some(
      (field) =>
        field.needs_review &&
        ['store_name', 'total', 'subtotal', 'tax', 'items', 'store_address', 'store_region'].includes(field.key)
    ) ?? false;

  const needsReview = job.review?.needs_review === true || criticalReview;
  const parseVerified = !needsReview;

  return {
    draft,
    rawText,
    parseVerified,
    needsReview,
    locationNeedsReview: locationNeedsReview || (!draft.storeRegion && !draft.storeAddress),
    jobId: job.id,
  };
}
