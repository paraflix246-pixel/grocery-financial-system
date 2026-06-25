import * as Clipboard from 'expo-clipboard';
import { Alert, Platform, Share } from 'react-native';

import type { Receipt } from '@/src/models/types';
import type { ReceiptExportFormat } from '@/src/services/receiptExportFormat';
import { buildReceiptExportCsv, buildReceiptExportJson } from '@/src/services/receiptExportFormat';
import { canAccessFeature } from '@/src/services/featureGateService';
import { getReceipts } from '@/src/services/storageService';

export type { ReceiptExportFormat, ReceiptExportRecord } from '@/src/services/receiptExportFormat';
export { buildReceiptExportCsv, buildReceiptExportJson } from '@/src/services/receiptExportFormat';

export async function exportAllReceipts(format: ReceiptExportFormat): Promise<string> {
  if (!canAccessFeature('export_advanced')) {
    throw new Error('CSV export requires a Household subscription');
  }
  const receipts = await getReceipts();
  return format === 'csv' ? buildReceiptExportCsv(receipts) : buildReceiptExportJson(receipts);
}

export async function shareReceiptExport(format: ReceiptExportFormat): Promise<void> {
  if (!canAccessFeature('export_advanced')) {
    throw new Error('CSV export requires a Household subscription');
  }
  const receipts = await getReceipts();
  await shareReceiptPayload(format, receipts);
}

export async function shareSingleReceiptExport(
  receipt: Receipt,
  format: ReceiptExportFormat
): Promise<void> {
  if (!canAccessFeature('export_advanced')) {
    throw new Error('CSV export requires a Household subscription');
  }
  await shareReceiptPayload(format, [receipt]);
}

async function shareReceiptPayload(format: ReceiptExportFormat, receipts: Receipt[]): Promise<void> {
  const payload =
    format === 'csv' ? buildReceiptExportCsv(receipts) : buildReceiptExportJson(receipts);
  if (!payload.trim()) {
    Alert.alert('Nothing to export', 'Scan or add receipts first.');
    return;
  }

  const title =
    receipts.length === 1
      ? `Penny Pantry receipt (${format.toUpperCase()})`
      : `Penny Pantry receipts (${format.toUpperCase()})`;
  if (Platform.OS === 'web') {
    await Clipboard.setStringAsync(payload);
    window.alert(`${title} copied to clipboard.`);
    return;
  }

  try {
    await Share.share({ message: payload, title });
  } catch {
    await Clipboard.setStringAsync(payload);
    Alert.alert('Copied', `${title} copied to clipboard.`);
  }
}
