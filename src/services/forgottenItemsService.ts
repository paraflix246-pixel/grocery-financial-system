import { resolveCanonicalName } from '@/src/services/itemNormalizationService';
import { getReceiptItemsWithStore } from '@/src/services/storageService';
import { computeRepurchaseCadences, type RepurchaseCadence } from '@/src/utils/repurchaseCadence';

export async function getForgottenItemNudges(limit = 5): Promise<RepurchaseCadence[]> {
  const items = await getReceiptItemsWithStore();
  const events = items.map((item) => ({
    canonicalName: resolveCanonicalName(item.name) ?? item.name.trim(),
    displayName: resolveCanonicalName(item.name) ?? item.name.trim(),
    receiptDate: item.receiptDate,
  }));
  return computeRepurchaseCadences(events).slice(0, limit);
}
