import type { ScanReceiptResult } from '@/src/services/receiptParsePipeline';

export async function scanReceiptMlkitOcrOnly(_imageUri: string): Promise<ScanReceiptResult> {
  throw new Error('scanReceiptMlkitOcrOnly is only available on iOS and Android native builds.');
}
