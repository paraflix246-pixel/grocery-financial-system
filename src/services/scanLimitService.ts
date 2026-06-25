import { getTierLimits } from '@/src/constants/tierLimitsConfig';
import { getReceipts } from '@/src/services/storageService';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { normalizeReceiptDate } from '@/src/utils/dateParser';

function currentMonthStartISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Count receipts saved this calendar month (local storage). */
export async function getMonthlyReceiptCount(): Promise<number> {
  const start = currentMonthStartISO();
  const receipts = await getReceipts({ startDate: start });
  return receipts.filter((receipt) => normalizeReceiptDate(receipt.date) >= start).length;
}

export type ScanLimitStatus = {
  allowed: boolean;
  count: number;
  limit: number | null;
  remaining: number | null;
};

/** Whether a new receipt can be saved this month on the current plan. */
export async function getScanLimitStatus(): Promise<ScanLimitStatus> {
  const limit = getTierLimits(useSubscriptionStore.getState().tier).receiptsPerMonth;
  if (limit == null) {
    return {
      allowed: true,
      count: 0,
      limit: null,
      remaining: null,
    };
  }

  const count = await getMonthlyReceiptCount();
  const remaining = Math.max(0, limit - count);
  return {
    allowed: count < limit,
    count,
    limit,
    remaining,
  };
}

export async function assertCanSaveNewReceipt(): Promise<void> {
  const status = await getScanLimitStatus();
  if (!status.allowed) {
    const { ScanLimitError } = await import('@/src/services/tierLimits');
    throw new ScanLimitError();
  }
}
