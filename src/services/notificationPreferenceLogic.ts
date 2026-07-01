import type { AppSettings } from '@/src/models/types';

export const NOTIFICATION_TYPES = [
  'price_drop',
  'price_change',
  'sale',
  'cheaper_store',
  'budget',
  'weekly_summary',
  'family_list',
  'pantry_low',
  'household_receipt',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationPrefs = Pick<
  AppSettings,
  | 'pushNotificationsEnabled'
  | 'notifyPriceAlerts'
  | 'notifyPriceChangeAlerts'
  | 'notifySaleAlerts'
  | 'notifyCheaperStoreAlerts'
  | 'notifyBudgetAlerts'
  | 'notifyWeeklySummaryAlerts'
  | 'notifyFamilyListAlerts'
  | 'notifyPantryLowAlerts'
  | 'notifyHouseholdReceiptAlerts'
>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  pushNotificationsEnabled: true,
  notifyPriceAlerts: true,
  notifyPriceChangeAlerts: true,
  notifySaleAlerts: true,
  notifyCheaperStoreAlerts: true,
  notifyBudgetAlerts: true,
  notifyWeeklySummaryAlerts: false,
  notifyFamilyListAlerts: true,
  notifyPantryLowAlerts: false,
  notifyHouseholdReceiptAlerts: false,
};

const TYPE_SETTING_KEY: Record<NotificationType, keyof NotificationPrefs> = {
  price_drop: 'notifyPriceAlerts',
  price_change: 'notifyPriceChangeAlerts',
  sale: 'notifySaleAlerts',
  cheaper_store: 'notifyCheaperStoreAlerts',
  budget: 'notifyBudgetAlerts',
  weekly_summary: 'notifyWeeklySummaryAlerts',
  family_list: 'notifyFamilyListAlerts',
  pantry_low: 'notifyPantryLowAlerts',
  household_receipt: 'notifyHouseholdReceiptAlerts',
};

export const PRICE_DROP_MIN_PERCENT = 3;
export const SALE_MIN_PERCENT_DROP = 15;
export const SIGNIFICANT_CHANGE_MIN_PERCENT = 5;

export function normalizeNotificationPrefs(
  partial?: Partial<NotificationPrefs> | null
): NotificationPrefs {
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...partial,
  };
}

export function applyNotificationDefaultsToAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    ...normalizeNotificationPrefs(settings),
  };
}

export function shouldSendNotificationType(
  type: NotificationType,
  settings: Partial<NotificationPrefs> | null | undefined
): boolean {
  const prefs = normalizeNotificationPrefs(settings ?? undefined);
  if (!prefs.pushNotificationsEnabled) return false;
  return Boolean(prefs[TYPE_SETTING_KEY[type]]);
}

export function isPriceDropPercent(percentDrop: number): boolean {
  return percentDrop >= PRICE_DROP_MIN_PERCENT;
}

export function isSalePercentDrop(percentDrop: number): boolean {
  return percentDrop >= SALE_MIN_PERCENT_DROP;
}

export function isSignificantPriceChangePercent(percentChange: number): boolean {
  return Math.abs(percentChange) >= SIGNIFICANT_CHANGE_MIN_PERCENT;
}

export function classifyPriceAlertTypes(alert: {
  percentDrop: number;
  source?: 'history' | 'custom';
  targetPrice?: number;
}): NotificationType[] {
  const types: NotificationType[] = [];

  if (alert.source === 'custom' && alert.targetPrice != null) {
    types.push('price_drop');
    return types;
  }

  const drop = alert.percentDrop;
  if (isPriceDropPercent(drop)) {
    types.push('price_drop');
  }
  if (isSalePercentDrop(drop)) {
    types.push('sale');
  }
  if (isSignificantPriceChangePercent(drop)) {
    types.push('price_change');
  } else if (drop > 0 && drop < PRICE_DROP_MIN_PERCENT) {
    types.push('price_change');
  }

  return types;
}

export function shouldNotifyPantryLowTransition(
  wasRunningLow: boolean,
  isRunningLow: boolean
): boolean {
  return !wasRunningLow && isRunningLow;
}
