import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Receipt } from '@/src/models/types';
import { buildReceiptExportCsv, buildReceiptExportJson } from '@/src/services/receiptExportFormat';

const sampleReceipt: Receipt = {
  id: 'r1',
  storeName: 'Target',
  date: '2026-01-15',
  subtotal: 10,
  tax: 0.82,
  total: 10.82,
  imageUri: '',
  storeAddress: '2700 Eldridge Pkwy',
  storeCity: 'Houston',
  storeRegion: 'TX',
  storePostalCode: '77082',
  storeCountry: 'US',
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
  items: [{ id: 'i1', receiptId: 'r1', name: 'Milk', price: 10, quantity: 1 }],
};

describe('receiptExportService', () => {
  it('includes location fields in JSON export', () => {
    const json = buildReceiptExportJson([sampleReceipt]);
    const parsed = JSON.parse(json) as { receipts: Array<Record<string, unknown>> };
    assert.equal(parsed.receipts[0]?.storeRegion, 'TX');
    assert.equal(parsed.receipts[0]?.storePostalCode, '77082');
    assert.match(String(parsed.receipts[0]?.storeLocationFormatted), /Houston/);
  });

  it('includes location columns in CSV export', () => {
    const csv = buildReceiptExportCsv([sampleReceipt]);
    assert.match(csv, /storeRegion/);
    assert.match(csv, /77082/);
    assert.match(csv, /Houston/);
  });
});
