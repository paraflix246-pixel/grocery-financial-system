import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import type { PantryItem } from '@/src/models/types';
import type { PriceAlert } from '@/src/services/analyticsService';
import {
  classifyPriceAlertTypes,
  type NotificationType,
  shouldNotifyPantryLowTransition,
  shouldSendNotificationType,
} from '@/src/services/notificationPreferenceLogic';
import { getAllPriceAlerts } from '@/src/services/priceAlertService';
import { getReceiptsInDateRange } from '@/src/services/storageService';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { endOfWeekISO, startOfWeekISO } from '@/src/utils/dateParser';
import { isRunningLowByQuantity } from '@/src/utils/pantryStatus';

export type InAppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

const inAppQueue: InAppNotification[] = [];
let listeners: Array<(n: InAppNotification[]) => void> = [];

const PUSH_TOKEN_KEY = '@pennypantry_expo_push_token';
export const WEEKLY_SUMMARY_NOTIFICATION_ID = 'weekly_spending_summary';

const NOTIFICATION_CHANNEL_IDS: Record<NotificationType, string> = {
  price_drop: 'price_drop',
  price_change: 'price_change',
  sale: 'sale',
  cheaper_store: 'cheaper_store',
  budget: 'budget',
  weekly_summary: 'weekly_summary',
  family_list: 'family_list',
  pantry_low: 'pantry_low',
  household_receipt: 'household_receipt',
};

const NOTIFICATION_TITLES: Record<NotificationType, string> = {
  price_drop: 'Price drop alert',
  price_change: 'Price change alert',
  sale: 'Sale alert',
  cheaper_store: 'Cheaper store found',
  budget: 'Budget alert',
  weekly_summary: 'Weekly spending summary',
  family_list: 'Family list updated',
  pantry_low: 'Pantry running low',
  household_receipt: 'Receipt saved to household',
};

let lastBudgetNotifyKey: string | null = null;
let channelsReady = false;

function notifyListeners(): void {
  listeners.forEach((fn) => fn([...inAppQueue]));
}

export function subscribeInAppNotifications(
  listener: (notifications: InAppNotification[]) => void
): () => void {
  listeners.push(listener);
  listener([...inAppQueue]);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function getInAppNotificationQueue(): InAppNotification[] {
  return [...inAppQueue];
}

function pushInApp(title: string, body: string): void {
  const notification: InAppNotification = {
    id: `inapp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    body,
    createdAt: new Date().toISOString(),
  };
  inAppQueue.unshift(notification);
  if (inAppQueue.length > 10) inAppQueue.pop();
  notifyListeners();
}

let nativeModule: typeof import('expo-notifications') | null = null;

async function getNotificationsModule() {
  if (Platform.OS === 'web') return null;
  if (!nativeModule) {
    nativeModule = await import('expo-notifications');
    nativeModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return nativeModule;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') return 'unsupported';
  const Notifications = await getNotificationsModule();
  if (!Notifications) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function openSystemNotificationSettings(): Promise<void> {
  if (Platform.OS === 'web') return;
  const { Linking } = await import('react-native');
  await Linking.openSettings();
}

function getSettings() {
  return useSettingsStore.getState().settings;
}

export function shouldSendPush(
  type: NotificationType,
  options?: { force?: boolean }
): boolean {
  if (options?.force && __DEV__) return true;
  return shouldSendNotificationType(type, getSettings());
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || channelsReady) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  for (const type of Object.keys(NOTIFICATION_CHANNEL_IDS) as NotificationType[]) {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_IDS[type], {
      name: NOTIFICATION_TITLES[type],
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  channelsReady = true;
}

/** Register Expo push token locally (Supabase table can be wired later). */
export async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  await ensureNotificationChannels();

  try {
    const token = await Notifications.getExpoPushTokenAsync();
    const value = token.data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, value);
    return value;
  } catch (error) {
    console.warn('[notifications] push token registration failed:', error);
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

type DispatchOptions = {
  type: NotificationType;
  title?: string;
  body: string;
  delaySeconds?: number;
  identifier?: string;
  force?: boolean;
};

async function dispatchNotification(options: DispatchOptions): Promise<boolean> {
  const { type, body, delaySeconds = 1, identifier, force } = options;
  const title = options.title ?? NOTIFICATION_TITLES[type];

  if (!shouldSendPush(type, { force })) return false;

  pushInApp(title, body);

  if (Platform.OS === 'web') return true;

  const granted = await requestNotificationPermissions();
  if (!granted) return false;

  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  await ensureNotificationChannels();

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      data: { type },
      ...(Platform.OS === 'android'
        ? { channelId: NOTIFICATION_CHANNEL_IDS[type] }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, delaySeconds),
      repeats: false,
    },
  });

  return true;
}

function formatPriceDropBody(alert: PriceAlert): string {
  if (alert.source === 'custom' && alert.targetPrice != null) {
    return `${alert.itemName} at ${alert.store} — now $${alert.newPrice.toFixed(2)} (target $${alert.targetPrice.toFixed(2)})`;
  }
  return `${alert.itemName} at ${alert.store} — now $${alert.newPrice.toFixed(2)} (↓${Math.round(alert.percentDrop)}%)`;
}

function formatPriceChangeBody(alert: PriceAlert): string {
  return `${alert.itemName} at ${alert.store} changed to $${alert.newPrice.toFixed(2)} (was $${alert.oldPrice.toFixed(2)})`;
}

function formatSaleBody(alert: PriceAlert): string {
  return `${alert.itemName} is on sale at ${alert.store} — $${alert.newPrice.toFixed(2)} (↓${Math.round(alert.percentDrop)}%)`;
}

export async function notifyPriceAlertMatches(alerts: PriceAlert[]): Promise<void> {
  if (alerts.length === 0) return;

  const dispatched = new Set<string>();

  for (const alert of alerts.slice(0, 5)) {
    const types = classifyPriceAlertTypes(alert);
    for (const type of types) {
      const key = `${type}:${alert.itemName}:${alert.store}`;
      if (dispatched.has(key)) continue;

      let body = formatPriceDropBody(alert);
      if (type === 'price_change') body = formatPriceChangeBody(alert);
      if (type === 'sale') body = formatSaleBody(alert);

      const sent = await dispatchNotification({ type, body });
      if (sent) dispatched.add(key);
    }
  }
}

export async function notifyCheaperStoreFound(
  itemName: string,
  currentStore: string,
  currentPrice: number,
  cheaperStore: string,
  cheaperPrice: number
): Promise<void> {
  const savings = currentPrice - cheaperPrice;
  const body = `${itemName} is $${cheaperPrice.toFixed(2)} at ${cheaperStore} vs $${currentPrice.toFixed(2)} at ${currentStore} (save $${savings.toFixed(2)})`;
  await dispatchNotification({ type: 'cheaper_store', body });
}

export async function schedulePriceAlertNotifications(): Promise<void> {
  const alerts = await getAllPriceAlerts(5);
  if (alerts.length === 0) return;
  await notifyPriceAlertMatches(alerts);
}

export async function scheduleBudgetAlertNotification(
  weeklySpend: number,
  weeklyBudget: number,
  threshold: number
): Promise<void> {
  if (weeklyBudget <= 0) return;

  const ratio = weeklySpend / weeklyBudget;
  if (ratio < threshold) return;

  const key = `${Math.round(ratio * 100)}_${Math.round(weeklySpend * 100)}`;
  if (lastBudgetNotifyKey === key) return;
  lastBudgetNotifyKey = key;

  const message =
    ratio >= 1
      ? `You've exceeded your weekly grocery budget ($${weeklySpend.toFixed(2)} / $${weeklyBudget.toFixed(2)}).`
      : `You've used ${Math.round(ratio * 100)}% of your weekly grocery budget ($${weeklySpend.toFixed(2)} / $${weeklyBudget.toFixed(2)}).`;

  await dispatchNotification({ type: 'budget', body: message });
}

async function buildWeeklySummaryBody(): Promise<string> {
  try {
    const start = startOfWeekISO();
    const end = endOfWeekISO();
    const receipts = await getReceiptsInDateRange(start, end);
    const total = receipts.reduce((sum, receipt) => sum + receipt.total, 0);
    const count = receipts.length;
    if (count === 0) {
      return 'No grocery receipts logged this week. Tap to review your spending.';
    }
    return `This week: ${count} receipt${count === 1 ? '' : 's'}, $${total.toFixed(2)} on groceries. Tap for details.`;
  } catch {
    return 'Your weekly grocery spending recap is ready. Tap to review.';
  }
}

export async function scheduleWeeklySummaryNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!shouldSendPush('weekly_summary')) {
    await cancelWeeklySummaryNotification();
    return;
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await ensureNotificationChannels();
  await cancelWeeklySummaryNotification();

  const body = await buildWeeklySummaryBody();

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_SUMMARY_NOTIFICATION_ID,
    content: {
      title: NOTIFICATION_TITLES.weekly_summary,
      body,
      data: { type: 'weekly_summary' },
      ...(Platform.OS === 'android'
        ? { channelId: NOTIFICATION_CHANNEL_IDS.weekly_summary }
        : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,
      hour: 18,
      minute: 0,
    },
  });
}

export async function cancelWeeklySummaryNotification(): Promise<void> {
  if (Platform.OS === 'web') return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_SUMMARY_NOTIFICATION_ID);
}

export async function notifyFamilyListUpdated(_updatedByName: string, listName: string): Promise<void> {
  const body = `Your shared list "${listName}" was updated.`;
  await dispatchNotification({ type: 'family_list', body });
}

export async function notifyPantryLowStock(item: Pick<PantryItem, 'name' | 'quantity' | 'unit' | 'lowStockThreshold'>): Promise<void> {
  const unit = item.unit ? ` ${item.unit}` : '';
  const body = `${item.name} is running low (${item.quantity}${unit} left).`;
  await dispatchNotification({ type: 'pantry_low', body });
}

export async function maybeNotifyPantryLowStock(
  before: PantryItem,
  after: PantryItem
): Promise<void> {
  const wasLow = isRunningLowByQuantity(before);
  const isLow = isRunningLowByQuantity(after);
  if (!shouldNotifyPantryLowTransition(wasLow, isLow)) return;
  await notifyPantryLowStock(after);
}

export async function notifyHouseholdReceiptSaved(storeName: string): Promise<void> {
  const body = `A receipt from ${storeName} was added to your household workspace.`;
  await dispatchNotification({ type: 'household_receipt', body });
}

export async function initializeNotificationSystem(): Promise<void> {
  if (Platform.OS === 'web') return;
  await ensureNotificationChannels();
  await registerPushToken();
  await refreshScheduledNotifications();
}

export async function refreshScheduledNotifications(): Promise<void> {
  const settings = getSettings();
  if (!settings) return;

  if (shouldSendNotificationType('weekly_summary', settings)) {
    await scheduleWeeklySummaryNotification();
  } else {
    await cancelWeeklySummaryNotification();
  }

  if (shouldSendNotificationType('price_drop', settings)) {
    await schedulePriceAlertNotifications();
  }
}

const DEV_SAMPLE_BODIES: Record<NotificationType, string> = {
  price_drop: 'Sample: Organic milk at Kroger — now $3.49 (↓12%)',
  price_change: 'Sample: Eggs at Safeway changed to $4.29 (was $3.99)',
  sale: 'Sample: Chicken breast is on sale at Costco — $2.99 (↓20%)',
  cheaper_store: 'Sample: Bananas are $0.49 at Aldi vs $0.79 at Walmart',
  budget: "Sample: You've used 92% of your weekly grocery budget ($138 / $150).",
  weekly_summary: 'Sample: This week: 4 receipts, $127.50 on groceries.',
  family_list: 'Sample: Your shared list "Weekly groceries" was updated.',
  pantry_low: 'Sample: Olive oil is running low (1 bottle left).',
  household_receipt: 'Sample: A receipt from Trader Joe\'s was added to your household workspace.',
};

/** In-app + push when a background receipt scan finishes. */
export async function notifyReceiptProcessed(): Promise<void> {
  pushInApp('Receipt ready', 'Your receipt finished processing. Open Receipts to review and save.');
  if (Platform.OS === 'web') return;

  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Receipt ready',
      body: 'Your receipt finished processing. Tap to review.',
      data: { type: 'receipt_processed' },
    },
    trigger: null,
  });
}

export async function sendDevSampleNotification(type: NotificationType): Promise<boolean> {
  if (!__DEV__) return false;
  return dispatchNotification({
    type,
    body: DEV_SAMPLE_BODIES[type],
    delaySeconds: 2,
    force: true,
  });
}

export { NOTIFICATION_TITLES };
