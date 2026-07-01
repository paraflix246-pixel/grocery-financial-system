import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveAppUserId } from '@/src/services/authService';
import {
  LEGACY_RECEIPT_OWNER_KEY,
} from '@/src/services/personalReceiptScopeLogic';

export {
  LEGACY_RECEIPT_OWNER_KEY,
  filterPersonalReceipts,
  receiptBelongsToOwner,
  resolveLegacyReceiptClaim,
  scopedReceiptStorageCacheKey,
} from '@/src/services/personalReceiptScopeLogic';

export async function getPersonalReceiptOwnerId(): Promise<string | null> {
  return resolveAppUserId();
}

export async function readLegacyReceiptOwnerId(): Promise<string | null> {
  return AsyncStorage.getItem(LEGACY_RECEIPT_OWNER_KEY);
}

export async function writeLegacyReceiptOwnerId(ownerId: string): Promise<void> {
  await AsyncStorage.setItem(LEGACY_RECEIPT_OWNER_KEY, ownerId);
}

export async function transferLegacyReceiptOwnerId(
  fromOwnerId: string,
  toOwnerId: string
): Promise<void> {
  if (fromOwnerId === toOwnerId) return;
  const legacyOwner = await readLegacyReceiptOwnerId();
  if (legacyOwner === fromOwnerId) {
    await writeLegacyReceiptOwnerId(toOwnerId);
  }
}

type AccountSwitchUser = {
  id: string;
  isGuest?: boolean;
};

/** Keep personal receipts isolated when switching accounts; adopt guest data on first sign-in. */
export async function handlePersonalReceiptsAfterAccountSwitch(
  previousUser: AccountSwitchUser | null,
  nextUserId: string
): Promise<void> {
  if (!nextUserId) return;
  if (previousUser?.id === nextUserId) return;

  const { transferPersonalReceiptsOnSignIn } = await import('@/src/services/storageService');
  const { invalidateAllScopedReceiptsCache } = await import('@/src/services/scopedReceiptService');

  if (previousUser?.isGuest && previousUser.id !== nextUserId) {
    await transferPersonalReceiptsOnSignIn(previousUser.id, nextUserId);
  }
  invalidateAllScopedReceiptsCache();
}
