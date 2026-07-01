import type { AppSettings, ReceiptImageStoragePreference } from '@/src/models/types';

export type ReceiptStorageSessionChoice = 'image_and_data' | 'data_only';

export const DEFAULT_PRIVACY_SETTINGS = {
  communityPriceSharing: false,
  receiptImageStorage: 'ask_each_time' as ReceiptImageStoragePreference,
  rememberReceiptImageChoice: false,
};

export function shouldAskReceiptStorageChoice(settings: AppSettings): boolean {
  if (!settings.rememberReceiptImageChoice) return true;
  return settings.receiptImageStorage === 'ask_each_time';
}

export function resolveSavedReceiptStorageChoice(
  settings: AppSettings
): ReceiptStorageSessionChoice | null {
  if (!settings.rememberReceiptImageChoice) return null;
  if (settings.receiptImageStorage === 'image_and_data') return 'image_and_data';
  if (settings.receiptImageStorage === 'data_only') return 'data_only';
  return null;
}

export function resolveReceiptImageUriForSave(
  imageUri: string | null | undefined,
  sessionChoice: ReceiptStorageSessionChoice
): string {
  if (sessionChoice === 'data_only') return '';
  return imageUri ?? '';
}

export function toPersistedReceiptImagePreference(
  choice: ReceiptStorageSessionChoice
): ReceiptImageStoragePreference {
  return choice;
}

export function applyPrivacyDefaultsToAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    communityPriceSharing:
      settings.communityPriceSharing ?? DEFAULT_PRIVACY_SETTINGS.communityPriceSharing,
    receiptImageStorage:
      settings.receiptImageStorage ?? DEFAULT_PRIVACY_SETTINGS.receiptImageStorage,
    rememberReceiptImageChoice:
      settings.rememberReceiptImageChoice ?? DEFAULT_PRIVACY_SETTINGS.rememberReceiptImageChoice,
  };
}
