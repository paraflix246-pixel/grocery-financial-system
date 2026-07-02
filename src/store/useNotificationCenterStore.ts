import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { buildHomeInsight, getWeekReceipts } from '@/src/services/analyticsService';
import { resolveComparisonList } from '@/src/services/listComparisonService';
import { buildMoneyLeakReport } from '@/src/services/moneyLeakService';
import {
  aggregateNotifications,
  countPantryNotificationBadge,
  countReceiptNotificationBadge,
  countShoppingListsNotificationBadge,
  countSpendingNotificationBadge,
  countStoresNotificationBadge,
  countUnreadNotifications,
  dismissAllNotifications,
  dismissNotification,
  filterDismissedNotifications,
  markNotificationsRead,
  type AppNotification,
  type DismissedNotificationState,
  type ReadNotificationState,
} from '@/src/services/notificationCenterLogic';
import {
  getInAppNotificationQueue,
  subscribeInAppNotifications,
} from '@/src/services/notificationService';
import { loadPantryItems } from '@/src/services/pantryService';
import { getAllPriceAlerts } from '@/src/services/priceAlertService';
import { useReceiptProcessingQueue } from '@/src/services/receiptProcessingQueue';
import { loadReceiptsForScope } from '@/src/services/scopedReceiptService';
import { useBudgetStore } from '@/src/store/useBudgetStore';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

const READ_STATE_KEY = '@pennypantry_notification_read_v1';
const DISMISSED_STATE_KEY = '@pennypantry_notification_dismissed_v1';

type NotificationCenterStore = {
  notifications: AppNotification[];
  unreadCount: number;
  receiptBadgeCount: number;
  shoppingListsBadgeCount: number;
  pantryBadgeCount: number;
  storesBadgeCount: number;
  spendingBadgeCount: number;
  readState: ReadNotificationState;
  dismissedState: DismissedNotificationState;
  hydrated: boolean;
  loading: boolean;
  hydrateReadState: () => Promise<void>;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (notification: AppNotification) => Promise<void>;
  dismiss: (notification: AppNotification) => Promise<void>;
  dismissAll: () => Promise<void>;
};

function recomputeCounts(
  notifications: AppNotification[],
  readState: ReadNotificationState
): Pick<
  NotificationCenterStore,
  | 'unreadCount'
  | 'receiptBadgeCount'
  | 'shoppingListsBadgeCount'
  | 'pantryBadgeCount'
  | 'storesBadgeCount'
  | 'spendingBadgeCount'
> {
  return {
    unreadCount: countUnreadNotifications(notifications, readState),
    receiptBadgeCount: countReceiptNotificationBadge(notifications, readState),
    shoppingListsBadgeCount: countShoppingListsNotificationBadge(notifications, readState),
    pantryBadgeCount: countPantryNotificationBadge(notifications, readState),
    storesBadgeCount: countStoresNotificationBadge(notifications, readState),
    spendingBadgeCount: countSpendingNotificationBadge(notifications, readState),
  };
}

async function persistReadState(readState: ReadNotificationState): Promise<void> {
  try {
    await AsyncStorage.setItem(READ_STATE_KEY, JSON.stringify(readState));
  } catch (error) {
    console.warn('[notificationCenter] read state persist failed:', error);
  }
}

async function persistDismissedState(dismissedState: DismissedNotificationState): Promise<void> {
  try {
    await AsyncStorage.setItem(DISMISSED_STATE_KEY, JSON.stringify(dismissedState));
  } catch (error) {
    console.warn('[notificationCenter] dismissed state persist failed:', error);
  }
}

let inAppSubscriptionActive = false;
let unsubscribeInApp: (() => void) | null = null;

/** Idempotent: subscribe once per app lifetime; safe to call from bootstrap. */
export function initializeInAppSubscription(): void {
  if (inAppSubscriptionActive) return;
  // Set before subscribe — subscribeInAppNotifications invokes the listener synchronously.
  inAppSubscriptionActive = true;
  unsubscribeInApp = subscribeInAppNotifications(() => {
    void useNotificationCenterStore.getState().refresh();
  });
}

export type { NotificationCenterStore };

export const useNotificationCenterStore = create<NotificationCenterStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  receiptBadgeCount: 0,
  shoppingListsBadgeCount: 0,
  pantryBadgeCount: 0,
  storesBadgeCount: 0,
  spendingBadgeCount: 0,
  readState: {},
  dismissedState: {},
  hydrated: false,
  loading: false,

  hydrateReadState: async () => {
    try {
      const [readRaw, dismissedRaw] = await Promise.all([
        AsyncStorage.getItem(READ_STATE_KEY),
        AsyncStorage.getItem(DISMISSED_STATE_KEY),
      ]);
      const readState = readRaw ? (JSON.parse(readRaw) as ReadNotificationState) : {};
      const dismissedState = dismissedRaw
        ? (JSON.parse(dismissedRaw) as DismissedNotificationState)
        : {};
      const { notifications } = get();
      set({
        readState,
        dismissedState,
        hydrated: true,
        ...recomputeCounts(notifications, readState),
      });
    } catch {
      set({ hydrated: true });
    }
  },

  refresh: async () => {
    const activeScope = useWorkspaceStore.getState().activeScope;
    const currentWorkspaceId = useWorkspaceStore.getState().currentWorkspaceId;
    const isWorkspaceView = activeScope === 'workspace';

    if (isWorkspaceView) {
      const readState = get().readState;
      set({
        notifications: [],
        loading: false,
        ...recomputeCounts([], readState),
      });
      return;
    }

    set({ loading: true });

    try {
      const weeklyBudget = useBudgetStore.getState().settings?.weeklyBudget ?? 200;
      const alertThreshold = useBudgetStore.getState().settings?.alertThreshold ?? 0.9;
      const notifyBudgetAlerts = useSettingsStore.getState().settings?.notifyBudgetAlerts ?? true;
      const isPro = useSubscriptionStore.getState().isPro();

      const receipts = await loadReceiptsForScope(activeScope, currentWorkspaceId);
      const [pantryItems, priceAlerts, comparison] = await Promise.all([
        loadPantryItems(),
        getAllPriceAlerts(5),
        resolveComparisonList({ scopedReceipts: receipts }),
      ]);

      const weekReceipts = getWeekReceipts(receipts);
      const homeInsight = await buildHomeInsight(weeklyBudget, alertThreshold, weekReceipts);
      const listItems = comparison?.items ?? [];
      const moneyLeakReport = buildMoneyLeakReport({ pantryItems, listItems, receipts });
      const receiptJobs = useReceiptProcessingQueue.getState().jobs;

      const aggregated = aggregateNotifications({
        priceAlerts,
        pantryItems,
        receiptJobs,
        inAppQueue: getInAppNotificationQueue(),
        moneyLeakReport,
        isPro,
        notifyBudgetAlerts,
        budget: homeInsight
          ? {
              weeklySpend: homeInsight.weeklySpend,
              weeklyBudget: homeInsight.weeklyBudget,
              isOverBudget: homeInsight.isOverBudget,
              isOverThreshold: homeInsight.isOverThreshold,
              budgetPercent: homeInsight.budgetPercent,
            }
          : null,
      });

      const { readState, dismissedState } = get();
      const notifications = filterDismissedNotifications(aggregated, dismissedState);
      set({
        notifications,
        loading: false,
        ...recomputeCounts(notifications, readState),
      });
    } catch (error) {
      console.error('[notificationCenter] refresh failed:', error);
      set({ loading: false });
    }
  },

  markAllRead: async () => {
    const { notifications, readState } = get();
    const next = markNotificationsRead(notifications, readState);
    set({ readState: next, ...recomputeCounts(notifications, next) });
    await persistReadState(next);
  },

  markRead: async (notification) => {
    const readState = get().readState;
    const next: ReadNotificationState = {
      ...readState,
      [notification.id]: notification.fingerprint ?? true,
    };
    const { notifications } = get();
    set({ readState: next, ...recomputeCounts(notifications, next) });
    await persistReadState(next);
  },

  dismiss: async (notification) => {
    const { notifications, dismissedState, readState } = get();
    const nextDismissed = dismissNotification(notification, dismissedState);
    const nextNotifications = notifications.filter((item) => item.id !== notification.id);
    set({
      dismissedState: nextDismissed,
      notifications: nextNotifications,
      ...recomputeCounts(nextNotifications, readState),
    });
    await persistDismissedState(nextDismissed);
  },

  dismissAll: async () => {
    const { notifications, dismissedState, readState } = get();
    const nextDismissed = dismissAllNotifications(notifications, dismissedState);
    set({
      dismissedState: nextDismissed,
      notifications: [],
      ...recomputeCounts([], readState),
    });
    await persistDismissedState(nextDismissed);
  },
}));
