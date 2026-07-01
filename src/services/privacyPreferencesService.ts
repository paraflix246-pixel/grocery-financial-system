export {
  DEFAULT_PRIVACY_SETTINGS,
  applyPrivacyDefaultsToAppSettings,
  resolveReceiptImageUriForSave,
  resolveSavedReceiptStorageChoice,
  shouldAskReceiptStorageChoice,
  toPersistedReceiptImagePreference,
  type ReceiptStorageSessionChoice,
} from '@/src/services/privacyPreferencesLogic';

import { getAppSettings } from '@/src/services/storageService';

export async function isCommunityPriceSharingEnabled(): Promise<boolean> {
  const settings = await getAppSettings();
  return Boolean(settings.communityPriceSharing);
}
