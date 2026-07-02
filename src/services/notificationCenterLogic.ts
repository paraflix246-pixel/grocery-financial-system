import type { PriceAlert } from '@/src/services/analyticsService';
import type { MoneyLeakBlindSpot, MoneyLeakReport } from '@/src/services/moneyLeakService';
import type { PantryItemView } from '@/src/services/pantryService';
import type { ReceiptQueueJob } from '@/src/services/receiptProcessingQueue';

export type AppNotificationKind =
  | 'price_alert'
  | 'pantry_running_low'
  | 'pantry_expiring'
  | 'money_leak_overlap'
  | 'money_leak_repeat'
  | 'money_leak_upgrade'
  | 'budget'
  | 'receipt_ready'
  | 'receipt_processing'
  | 'receipt_failed'
  | 'in_app';

export type AppNotification = {
  id: string;
  kind: AppNotificationKind;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  bodyKey: string;
  bodyParams?: Record<string, string | number>;
  createdAt: string;
  route?: string;
  fingerprint?: string;
};

export type InAppQueueItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export type BudgetAlertInput = {
  weeklySpend: number;
  weeklyBudget: number;
  isOverBudget: boolean;
  isOverThreshold: boolean;
  budgetPercent: number;
};

export type NotificationCenterInput = {
  priceAlerts: PriceAlert[];
  pantryItems: PantryItemView[];
  receiptJobs: ReceiptQueueJob[];
  inAppQueue: InAppQueueItem[];
  moneyLeakReport?: MoneyLeakReport | null;
  isPro?: boolean;
  budget?: BudgetAlertInput | null;
  notifyBudgetAlerts?: boolean;
  now?: Date;
};

const KIND_ICON: Record<AppNotificationKind, string> = {
  price_alert: '💰',
  pantry_running_low: '📦',
  pantry_expiring: '⏳',
  money_leak_overlap: '🔄',
  money_leak_repeat: '🔁',
  money_leak_upgrade: '💧',
  budget: '📊',
  receipt_ready: '✅',
  receipt_processing: '🧾',
  receipt_failed: '⚠️',
  in_app: '🔔',
};

const RECEIPT_RELATED_KINDS = new Set<AppNotificationKind>([
  'receipt_ready',
  'receipt_processing',
  'receipt_failed',
]);

const SHOPPING_LISTS_RELATED_KINDS = new Set<AppNotificationKind>([
  'money_leak_overlap',
  'money_leak_repeat',
  'money_leak_upgrade',
]);

const PANTRY_RELATED_KINDS = new Set<AppNotificationKind>([
  'pantry_running_low',
  'pantry_expiring',
]);

const STORES_RELATED_KINDS = new Set<AppNotificationKind>(['price_alert']);

const SPENDING_RELATED_KINDS = new Set<AppNotificationKind>(['budget']);

export type NotificationHomeBadgeCategory =
  | 'receipt'
  | 'shoppingLists'
  | 'pantry'
  | 'stores'
  | 'spending';

/** @deprecated Use NotificationHomeBadgeCategory */
export type NotificationMenuBadgeCategory = 'pantry' | 'stores';

export function getNotificationKindIcon(kind: AppNotificationKind): string {
  return KIND_ICON[kind];
}

function previewNames(items: Array<{ name: string }>, max = 2): string {
  return items
    .slice(0, max)
    .map((item) => item.name)
    .join(', ');
}

function pantryRunningLowFingerprint(items: PantryItemView[]): string {
  return items
    .filter((item) => item.status === 'running_low')
    .map((item) => `${item.id}:${item.quantity}`)
    .sort()
    .join('|');
}

function pantryExpiringFingerprint(items: PantryItemView[]): string {
  return items
    .filter((item) => item.status === 'expiring_soon')
    .map((item) => `${item.id}:${item.daysUntilExpiry ?? ''}`)
    .sort()
    .join('|');
}

export function buildPantryRunningLowNotification(items: PantryItemView[]): AppNotification | null {
  const runningLow = items.filter((item) => item.status === 'running_low');
  if (runningLow.length === 0) return null;

  const names = previewNames(runningLow);
  return {
    id: 'pantry-running-low',
    kind: 'pantry_running_low',
    titleKey: 'notificationCenter.pantryRunningLow.title',
    bodyKey:
      runningLow.length === 1
        ? 'notificationCenter.pantryRunningLow.bodyOne'
        : 'notificationCenter.pantryRunningLow.bodyMany',
    bodyParams: { count: runningLow.length, names },
    createdAt: new Date().toISOString(),
    route: '/pantry?filter=running_low',
    fingerprint: pantryRunningLowFingerprint(items),
  };
}

export function buildPantryExpiringNotification(items: PantryItemView[]): AppNotification | null {
  const expiring = items.filter((item) => item.status === 'expiring_soon');
  if (expiring.length === 0) return null;

  const names = previewNames(expiring);
  return {
    id: 'pantry-expiring',
    kind: 'pantry_expiring',
    titleKey: 'notificationCenter.pantryExpiring.title',
    bodyKey:
      expiring.length === 1
        ? 'notificationCenter.pantryExpiring.bodyOne'
        : 'notificationCenter.pantryExpiring.bodyMany',
    bodyParams: { count: expiring.length, names },
    createdAt: new Date().toISOString(),
    route: '/pantry?filter=expiring_soon',
    fingerprint: pantryExpiringFingerprint(items),
  };
}

export function buildPriceAlertNotifications(alerts: PriceAlert[]): AppNotification[] {
  return alerts.map((alert, index) => {
    const dropLabel =
      alert.source === 'custom' && alert.targetPrice != null
        ? `target $${alert.targetPrice.toFixed(2)}`
        : `↓${Math.round(alert.percentDrop)}%`;

    return {
      id: `price-alert:${alert.itemName}:${alert.store}`,
      kind: 'price_alert' as const,
      titleKey: 'notificationCenter.priceAlert.title',
      titleParams: { item: alert.itemName },
      bodyKey: 'notificationCenter.priceAlert.body',
      bodyParams: {
        store: alert.store,
        price: alert.newPrice.toFixed(2),
        detail: dropLabel,
      },
      createdAt: new Date(Date.now() - index * 60_000).toISOString(),
      route: '/price-tracker?tab=alerts',
      fingerprint: `${alert.newPrice}:${dropLabel}`,
    };
  });
}

export function buildBudgetNotification(
  budget: BudgetAlertInput | null | undefined,
  notifyBudgetAlerts = true
): AppNotification | null {
  if (!budget || !notifyBudgetAlerts) return null;
  if (!budget.isOverBudget && !budget.isOverThreshold) return null;

  const overBudget = budget.isOverBudget;
  return {
    id: 'budget-alert',
    kind: 'budget',
    titleKey: overBudget
      ? 'notificationCenter.budget.overTitle'
      : 'notificationCenter.budget.thresholdTitle',
    bodyKey: overBudget
      ? 'notificationCenter.budget.overBody'
      : 'notificationCenter.budget.thresholdBody',
    bodyParams: {
      spend: budget.weeklySpend.toFixed(2),
      budget: budget.weeklyBudget.toFixed(2),
      percent: Math.round(budget.budgetPercent * 100),
    },
    createdAt: new Date().toISOString(),
    route: '/settings/budget',
    fingerprint: `${overBudget}:${budget.weeklySpend.toFixed(2)}:${budget.weeklyBudget.toFixed(2)}`,
  };
}

export function buildReceiptQueueNotifications(jobs: ReceiptQueueJob[]): AppNotification[] {
  const notifications: AppNotification[] = [];

  for (const job of jobs) {
    if (job.status === 'done') {
      notifications.push({
        id: `receipt-ready:${job.id}`,
        kind: 'receipt_ready',
        titleKey: 'notificationCenter.receiptReady.title',
        bodyKey: 'notificationCenter.receiptReady.body',
        createdAt: new Date(job.finishedAt ?? job.createdAt).toISOString(),
        route: '/(tabs)/receipts',
      });
      continue;
    }

    if (job.status === 'failed') {
      notifications.push({
        id: `receipt-failed:${job.id}`,
        kind: 'receipt_failed',
        titleKey: 'notificationCenter.receiptFailed.title',
        bodyKey: job.error
          ? 'notificationCenter.receiptFailed.body'
          : 'receiptQueue.failedBody',
        bodyParams: job.error ? { error: job.error } : undefined,
        createdAt: new Date(job.finishedAt ?? job.createdAt).toISOString(),
        route: '/(tabs)/scan',
      });
      continue;
    }

    if (job.status === 'queued' || job.status === 'processing') {
      notifications.push({
        id: `receipt-processing:${job.id}`,
        kind: 'receipt_processing',
        titleKey: 'notificationCenter.receiptProcessing.title',
        bodyKey: 'notificationCenter.receiptProcessing.body',
        createdAt: new Date(job.createdAt).toISOString(),
        route: '/(tabs)/scan',
      });
    }
  }

  return notifications;
}

export function buildInAppNotifications(queue: InAppQueueItem[]): AppNotification[] {
  return queue.map((item) => ({
    id: `in-app:${item.id}`,
    kind: 'in_app' as const,
    titleKey: 'notificationCenter.inApp.title',
    titleParams: { title: item.title },
    bodyKey: 'notificationCenter.inApp.body',
    bodyParams: { body: item.body },
    createdAt: item.createdAt,
    fingerprint: item.body,
  }));
}

function moneyLeakRouteForSpot(spot: MoneyLeakBlindSpot): string {
  switch (spot.kind) {
    case 'overlap':
      return '/(tabs)/shopping-lists?browse=1';
    case 'expiring':
      return '/pantry?filter=expiring_soon';
    case 'low_stock':
      return '/pantry?filter=running_low';
    case 'repeat_rebuy':
      return '/(tabs)/receipts';
    default:
      return '/pantry';
  }
}

function moneyLeakKindForSpot(spot: MoneyLeakBlindSpot): AppNotificationKind {
  if (spot.kind === 'overlap') return 'money_leak_overlap';
  if (spot.kind === 'repeat_rebuy') return 'money_leak_repeat';
  return 'money_leak_overlap';
}

/** Money-leak blind spots as in-app notifications (overlap + repeat rebuy; pantry status uses pantry_* kinds). */
export function buildMoneyLeakNotifications(
  report: MoneyLeakReport | null | undefined,
  isPro = false
): AppNotification[] {
  if (!report?.hasData || report.blindSpotCount === 0) return [];

  const leakSpots = report.blindSpots.filter(
    (spot) => spot.kind === 'overlap' || spot.kind === 'repeat_rebuy'
  );
  if (leakSpots.length === 0) return [];

  const visibleSpots = isPro ? leakSpots : leakSpots.slice(0, 1);
  const notifications: AppNotification[] = visibleSpots.map((spot, index) => ({
    id: `money-leak:${spot.id}`,
    kind: moneyLeakKindForSpot(spot),
    titleKey: 'notificationCenter.moneyLeak.title',
    bodyKey: spot.labelKey,
    bodyParams: spot.labelParams,
    createdAt: new Date(Date.now() - index * 30_000).toISOString(),
    route: moneyLeakRouteForSpot(spot),
    fingerprint: `${spot.kind}:${JSON.stringify(spot.labelParams ?? {})}`,
  }));

  if (!isPro && report.blindSpotCount > visibleSpots.length) {
    notifications.push({
      id: 'money-leak-upgrade',
      kind: 'money_leak_upgrade',
      titleKey: 'notificationCenter.moneyLeak.upgradeTitle',
      bodyKey: 'notificationCenter.moneyLeak.upgradeBody',
      bodyParams: { count: report.blindSpotCount },
      createdAt: new Date().toISOString(),
      route: '/paywall?plan=pro',
      fingerprint: `upgrade:${report.blindSpotCount}`,
    });
  }

  return notifications;
}

export function aggregateNotifications(input: NotificationCenterInput): AppNotification[] {
  const items: AppNotification[] = [];

  const pantryLow = buildPantryRunningLowNotification(input.pantryItems);
  if (pantryLow) items.push(pantryLow);

  const pantryExpiring = buildPantryExpiringNotification(input.pantryItems);
  if (pantryExpiring) items.push(pantryExpiring);

  items.push(...buildMoneyLeakNotifications(input.moneyLeakReport, input.isPro ?? false));

  items.push(...buildPriceAlertNotifications(input.priceAlerts));

  const budget = buildBudgetNotification(input.budget, input.notifyBudgetAlerts ?? true);
  if (budget) items.push(budget);

  items.push(...buildReceiptQueueNotifications(input.receiptJobs));
  items.push(...buildInAppNotifications(input.inAppQueue));

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countPantryBadgeItems(pantryItems: PantryItemView[]): number {
  return pantryItems.filter(
    (item) => item.status === 'running_low' || item.status === 'expiring_soon'
  ).length;
}

export function isReceiptRelatedNotification(notification: AppNotification): boolean {
  return RECEIPT_RELATED_KINDS.has(notification.kind);
}

export function isShoppingListsRelatedNotification(notification: AppNotification): boolean {
  return SHOPPING_LISTS_RELATED_KINDS.has(notification.kind);
}

export function isPantryRelatedNotification(notification: AppNotification): boolean {
  return PANTRY_RELATED_KINDS.has(notification.kind);
}

export function isStoresRelatedNotification(notification: AppNotification): boolean {
  return STORES_RELATED_KINDS.has(notification.kind);
}

export function isSpendingRelatedNotification(notification: AppNotification): boolean {
  return SPENDING_RELATED_KINDS.has(notification.kind);
}

export function getNotificationHomeBadgeCategory(
  notification: AppNotification
): NotificationHomeBadgeCategory | null {
  if (isReceiptRelatedNotification(notification)) return 'receipt';
  if (isShoppingListsRelatedNotification(notification)) return 'shoppingLists';
  if (isPantryRelatedNotification(notification)) return 'pantry';
  if (isStoresRelatedNotification(notification)) return 'stores';
  if (isSpendingRelatedNotification(notification)) return 'spending';
  return null;
}

/** @deprecated Use getNotificationHomeBadgeCategory */
export function getNotificationMenuBadgeCategory(
  notification: AppNotification
): NotificationMenuBadgeCategory | null {
  const category = getNotificationHomeBadgeCategory(notification);
  if (category === 'pantry' || category === 'stores') return category;
  return null;
}

export function countNotificationBadgeByCategory(
  notifications: AppNotification[],
  readState: ReadNotificationState,
  category: NotificationHomeBadgeCategory
): number {
  return notifications.filter(
    (notification) =>
      getNotificationHomeBadgeCategory(notification) === category &&
      !isNotificationRead(notification, readState)
  ).length;
}

export function countReceiptNotificationBadge(
  notifications: AppNotification[],
  readState: ReadNotificationState
): number {
  return countNotificationBadgeByCategory(notifications, readState, 'receipt');
}

export function countShoppingListsNotificationBadge(
  notifications: AppNotification[],
  readState: ReadNotificationState
): number {
  return countNotificationBadgeByCategory(notifications, readState, 'shoppingLists');
}

export function countPantryNotificationBadge(
  notifications: AppNotification[],
  readState: ReadNotificationState
): number {
  return countNotificationBadgeByCategory(notifications, readState, 'pantry');
}

export function countStoresNotificationBadge(
  notifications: AppNotification[],
  readState: ReadNotificationState
): number {
  return countNotificationBadgeByCategory(notifications, readState, 'stores');
}

export function countSpendingNotificationBadge(
  notifications: AppNotification[],
  readState: ReadNotificationState
): number {
  return countNotificationBadgeByCategory(notifications, readState, 'spending');
}

export type ReadNotificationState = Record<string, string | true>;

export function countUnreadNotifications(
  notifications: AppNotification[],
  readState: ReadNotificationState
): number {
  return notifications.filter((notification) => !isNotificationRead(notification, readState)).length;
}

export function isNotificationRead(
  notification: AppNotification,
  readState: ReadNotificationState
): boolean {
  const entry = readState[notification.id];
  if (entry === undefined) return false;
  if (entry === true) return true;
  if (notification.fingerprint) return entry === notification.fingerprint;
  return true;
}

export function markNotificationsRead(
  notifications: AppNotification[],
  readState: ReadNotificationState
): ReadNotificationState {
  const next = { ...readState };
  for (const notification of notifications) {
    next[notification.id] = notification.fingerprint ?? true;
  }
  return next;
}

/** Dismiss hides a notification until its fingerprint changes (or permanently when no fingerprint). */
export type DismissedNotificationState = Record<string, string | true>;

export function isNotificationDismissed(
  notification: AppNotification,
  dismissedState: DismissedNotificationState
): boolean {
  const entry = dismissedState[notification.id];
  if (entry === undefined) return false;
  if (entry === true) return true;
  if (notification.fingerprint) return entry === notification.fingerprint;
  return true;
}

export function filterDismissedNotifications(
  notifications: AppNotification[],
  dismissedState: DismissedNotificationState
): AppNotification[] {
  return notifications.filter((notification) => !isNotificationDismissed(notification, dismissedState));
}

export function dismissNotification(
  notification: AppNotification,
  dismissedState: DismissedNotificationState
): DismissedNotificationState {
  return {
    ...dismissedState,
    [notification.id]: notification.fingerprint ?? true,
  };
}

export function dismissAllNotifications(
  notifications: AppNotification[],
  dismissedState: DismissedNotificationState
): DismissedNotificationState {
  const next = { ...dismissedState };
  for (const notification of notifications) {
    next[notification.id] = notification.fingerprint ?? true;
  }
  return next;
}
