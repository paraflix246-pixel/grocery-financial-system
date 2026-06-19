import { Platform } from 'react-native';

import { getPriceAlerts } from '@/src/services/analyticsService';
import { useSettingsStore } from '@/src/store/useSettingsStore';

type InAppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

const inAppQueue: InAppNotification[] = [];
let listeners: Array<(n: InAppNotification[]) => void> = [];

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

function pushInApp(title: string, body: string): void {
  const notification: InAppNotification = {
    id: `inapp_${Date.now()}`,
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

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function schedulePriceAlertNotifications(): Promise<void> {
  const settings = useSettingsStore.getState().settings;
  if (!settings?.notifyPriceAlerts) return;

  const alerts = await getPriceAlerts(3);
  if (alerts.length === 0) return;

  if (Platform.OS === 'web') {
    const top = alerts[0];
    pushInApp(
      'Price drop alert',
      `${top.itemName} at ${top.store} dropped ${Math.round(top.percentDrop)}%`
    );
    return;
  }

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const alert of alerts.slice(0, 3)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Price drop alert',
        body: `${alert.itemName} at ${alert.store} — now $${alert.newPrice.toFixed(2)} (↓${Math.round(alert.percentDrop)}%)`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
        repeats: false,
      },
    });
  }
}

export async function scheduleBudgetAlertNotification(
  weeklySpend: number,
  weeklyBudget: number,
  threshold: number
): Promise<void> {
  const settings = useSettingsStore.getState().settings;
  if (!settings?.notifyBudgetAlerts) return;
  if (weeklyBudget <= 0) return;

  const ratio = weeklySpend / weeklyBudget;
  if (ratio < threshold) return;

  const message = `You've used ${Math.round(ratio * 100)}% of your weekly grocery budget ($${weeklySpend.toFixed(2)} / $${weeklyBudget.toFixed(2)}).`;

  if (Platform.OS === 'web') {
    pushInApp('Budget alert', message);
    return;
  }

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.scheduleNotificationAsync({
    content: { title: 'Budget alert', body: message },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 30,
      repeats: false,
    },
  });
}

export async function refreshScheduledNotifications(): Promise<void> {
  await schedulePriceAlertNotifications();
}
