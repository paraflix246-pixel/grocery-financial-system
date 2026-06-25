import type { Receipt } from '@/src/models/types';
import { formatStoreLocationForCopy } from '@/src/utils/storeLocationParser';

export type ReceiptExportFormat = 'json' | 'csv';

export type ReceiptExportRecord = {
  id: string;
  storeName: string;
  date: string;
  subtotal: number | null;
  tax: number | null;
  total: number;
  storeAddress: string | null;
  storeCity: string | null;
  storeRegion: string | null;
  storePostalCode: string | null;
  storeCountry: string | null;
  storeLocationFormatted: string | null;
  itemCount: number;
  items: Array<{ name: string; price: number; quantity: number; unitPrice?: number | null; unit?: string | null }>;
};

function toExportRecord(receipt: Receipt): ReceiptExportRecord {
  const items = (receipt.items ?? []).map((item) => ({
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    unitPrice: item.unitPrice ?? null,
    unit: item.unit ?? null,
  }));

  return {
    id: receipt.id,
    storeName: receipt.storeName,
    date: receipt.date,
    subtotal: receipt.subtotal ?? null,
    tax: receipt.tax ?? null,
    total: receipt.total,
    storeAddress: receipt.storeAddress ?? null,
    storeCity: receipt.storeCity ?? null,
    storeRegion: receipt.storeRegion ?? null,
    storePostalCode: receipt.storePostalCode ?? null,
    storeCountry: receipt.storeCountry ?? null,
    storeLocationFormatted: formatStoreLocationForCopy(receipt) || null,
    itemCount: items.length,
    items,
  };
}

export function buildReceiptExportJson(receipts: Receipt[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      receiptCount: receipts.length,
      receipts: receipts.map(toExportRecord),
    },
    null,
    2
  );
}

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildReceiptExportCsv(receipts: Receipt[]): string {
  const headers = [
    'id',
    'storeName',
    'date',
    'subtotal',
    'tax',
    'total',
    'storeAddress',
    'storeCity',
    'storeRegion',
    'storePostalCode',
    'storeCountry',
    'storeLocationFormatted',
    'itemCount',
    'itemsJson',
  ];

  const rows = receipts.map((receipt) => {
    const record = toExportRecord(receipt);
    return [
      record.id,
      record.storeName,
      record.date,
      record.subtotal,
      record.tax,
      record.total,
      record.storeAddress,
      record.storeCity,
      record.storeRegion,
      record.storePostalCode,
      record.storeCountry,
      record.storeLocationFormatted,
      record.itemCount,
      JSON.stringify(record.items),
    ]
      .map(csvEscape)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
