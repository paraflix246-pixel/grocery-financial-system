import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PantryItemView } from '@/src/services/pantryService';
import {
  aggregateNotifications,
  buildMoneyLeakNotifications,
  buildPantryRunningLowNotification,
  countPantryBadgeItems,
  countPantryNotificationBadge,
  countReceiptNotificationBadge,
  countShoppingListsNotificationBadge,
  countSpendingNotificationBadge,
  countStoresNotificationBadge,
  countUnreadNotifications,
  dismissAllNotifications,
  dismissNotification,
  filterDismissedNotifications,
  getNotificationHomeBadgeCategory,
  getNotificationMenuBadgeCategory,
  isNotificationDismissed,
  isNotificationRead,
  markNotificationsRead,
} from '@/src/services/notificationCenterLogic';
import { buildMoneyLeakReport } from '@/src/services/moneyLeakService';

function pantryItem(partial: Partial<PantryItemView> & Pick<PantryItemView, 'id' | 'name' | 'status'>): PantryItemView {
  return {
    quantity: 1,
    unit: 'ea',
    category: 'Pantry',
    addedAt: '2026-01-01',
    lowStockThreshold: 2,
    daysUntilExpiry: null,
    statusLabel: partial.status,
    ...partial,
  } as PantryItemView;
}

describe('notificationCenterLogic', () => {
  it('builds running low pantry notification with item preview', () => {
    const notification = buildPantryRunningLowNotification([
      pantryItem({ id: '1', name: 'Bread', status: 'running_low' }),
      pantryItem({ id: '2', name: 'Eggs', status: 'running_low' }),
      pantryItem({ id: '3', name: 'Milk', status: 'ok' }),
    ]);

    assert.ok(notification);
    assert.equal(notification?.kind, 'pantry_running_low');
    assert.equal(notification?.bodyParams?.count, 2);
    assert.equal(notification?.bodyParams?.names, 'Bread, Eggs');
    assert.equal(notification?.route, '/pantry?filter=running_low');
  });

  it('counts pantry badge items for running low and expiring soon', () => {
    const count = countPantryBadgeItems([
      pantryItem({ id: '1', name: 'Bread', status: 'running_low' }),
      pantryItem({ id: '2', name: 'Yogurt', status: 'expiring_soon' }),
      pantryItem({ id: '3', name: 'Rice', status: 'ok' }),
    ]);
    assert.equal(count, 2);
  });

  it('aggregates pantry, price, and receipt notifications', () => {
    const notifications = aggregateNotifications({
      priceAlerts: [
        {
          itemName: 'Milk',
          store: 'Kroger',
          oldPrice: 4.29,
          newPrice: 3.49,
          percentDrop: 18,
          emoji: '🥛',
        },
      ],
      pantryItems: [pantryItem({ id: '1', name: 'Bread', status: 'running_low' })],
      receiptJobs: [
        {
          id: 'job-1',
          imageUri: 'file://a.jpg',
          status: 'done',
          stage: 'done',
          createdAt: Date.now(),
          finishedAt: Date.now(),
        },
      ],
      inAppQueue: [],
      budget: {
        weeklySpend: 180,
        weeklyBudget: 200,
        isOverBudget: false,
        isOverThreshold: true,
        budgetPercent: 0.9,
      },
    });

    const kinds = new Set(notifications.map((item) => item.kind));
    assert.ok(kinds.has('pantry_running_low'));
    assert.ok(kinds.has('price_alert'));
    assert.ok(kinds.has('receipt_ready'));
    assert.ok(kinds.has('budget'));
  });

  it('tracks unread state with fingerprints for pantry notifications', () => {
    const notification = buildPantryRunningLowNotification([
      pantryItem({ id: '1', name: 'Bread', status: 'running_low', quantity: 1 }),
    ]);
    assert.ok(notification);

    let readState = markNotificationsRead([notification!], {});
    assert.equal(isNotificationRead(notification!, readState), true);

    const changed = buildPantryRunningLowNotification([
      pantryItem({ id: '1', name: 'Bread', status: 'running_low', quantity: 0 }),
    ]);
    assert.ok(changed);
    assert.equal(isNotificationRead(changed!, readState), false);
    assert.equal(countUnreadNotifications([changed!], readState), 1);
  });

  it('builds money leak overlap notification for pantry-list duplicate', () => {
    const report = buildMoneyLeakReport({
      pantryItems: [
        pantryItem({ id: '1', name: 'Bread', status: 'ok', daysUntilExpiry: null }),
      ],
      listItems: [
        {
          id: 'l1',
          listId: 'list1',
          name: 'Bread',
          expectedPrice: 3,
          quantity: 1,
          category: 'Bakery',
          sortOrder: 0,
        },
      ],
      receipts: [],
    });

    const notifications = buildMoneyLeakNotifications(report, true);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0]?.kind, 'money_leak_overlap');
    assert.equal(notifications[0]?.bodyKey, 'moneyLeak.spots.overlapOne');
    assert.equal(notifications[0]?.route, '/(tabs)/shopping-lists?browse=1');
  });

  it('adds upgrade notification for free users with hidden blind spots', () => {
    const report = buildMoneyLeakReport({
      pantryItems: [
        pantryItem({ id: '1', name: 'Bread', status: 'ok', daysUntilExpiry: null }),
        pantryItem({ id: '2', name: 'Milk', status: 'ok', daysUntilExpiry: null }),
      ],
      listItems: [
        {
          id: 'l1',
          listId: 'list1',
          name: 'Bread',
          expectedPrice: 3,
          quantity: 1,
          category: 'Bakery',
          sortOrder: 0,
        },
        {
          id: 'l2',
          listId: 'list1',
          name: 'Milk',
          expectedPrice: 4,
          quantity: 1,
          category: 'Dairy',
          sortOrder: 1,
        },
      ],
      receipts: [],
    });

    const notifications = buildMoneyLeakNotifications(report, false);
    assert.equal(notifications.length, 2);
    assert.equal(notifications[0]?.kind, 'money_leak_overlap');
    assert.equal(notifications[1]?.kind, 'money_leak_upgrade');
    assert.equal(notifications[1]?.route, '/paywall?plan=pro');
  });

  it('counts shopping lists badge for unread money leak overlap notifications', () => {
    const report = buildMoneyLeakReport({
      pantryItems: [pantryItem({ id: '1', name: 'Bread', status: 'ok', daysUntilExpiry: null })],
      listItems: [
        {
          id: 'l1',
          listId: 'list1',
          name: 'Bread',
          expectedPrice: 3,
          quantity: 1,
          category: 'Bakery',
          sortOrder: 0,
        },
      ],
      receipts: [],
    });

    const notifications = aggregateNotifications({
      priceAlerts: [],
      pantryItems: [],
      receiptJobs: [],
      inAppQueue: [],
      moneyLeakReport: report,
      isPro: true,
    });

    assert.equal(countShoppingListsNotificationBadge(notifications, {}), 1);
    assert.equal(countPantryNotificationBadge(notifications, {}), 0);
    assert.equal(countUnreadNotifications(notifications, {}), 1);
  });

  it('maps notification kinds to home badge categories', () => {
    const notifications = aggregateNotifications({
      priceAlerts: [
        {
          itemName: 'Milk',
          store: 'Kroger',
          oldPrice: 4.29,
          newPrice: 3.49,
          percentDrop: 18,
          emoji: '🥛',
        },
      ],
      pantryItems: [
        pantryItem({ id: '1', name: 'Bread', status: 'running_low' }),
        pantryItem({ id: '2', name: 'Yogurt', status: 'expiring_soon' }),
      ],
      receiptJobs: [
        {
          id: 'job-1',
          imageUri: 'file://a.jpg',
          status: 'processing',
          stage: 'ocr',
          createdAt: Date.now(),
        },
      ],
      inAppQueue: [],
      budget: {
        weeklySpend: 220,
        weeklyBudget: 200,
        isOverBudget: true,
        isOverThreshold: true,
        budgetPercent: 1.1,
      },
    });

    const byCategory = (category: string) =>
      notifications
        .filter((n) => getNotificationHomeBadgeCategory(n) === category)
        .map((n) => n.kind);

    assert.deepEqual(new Set(byCategory('pantry')), new Set(['pantry_running_low', 'pantry_expiring']));
    assert.deepEqual(byCategory('stores'), ['price_alert']);
    assert.deepEqual(byCategory('receipt'), ['receipt_processing']);
    assert.deepEqual(byCategory('spending'), ['budget']);
    assert.equal(countPantryNotificationBadge(notifications, {}), 2);
    assert.equal(countStoresNotificationBadge(notifications, {}), 1);
    assert.equal(countReceiptNotificationBadge(notifications, {}), 1);
    assert.equal(countSpendingNotificationBadge(notifications, {}), 1);
    assert.equal(countUnreadNotifications(notifications, {}), 5);
  });

  it('keeps legacy menu badge categories for pantry and stores only', () => {
    const notifications = aggregateNotifications({
      priceAlerts: [
        {
          itemName: 'Milk',
          store: 'Kroger',
          oldPrice: 4.29,
          newPrice: 3.49,
          percentDrop: 18,
          emoji: '🥛',
        },
      ],
      pantryItems: [pantryItem({ id: '1', name: 'Bread', status: 'running_low' })],
      receiptJobs: [],
      inAppQueue: [],
    });

    const pantryKinds = notifications
      .filter((n) => getNotificationMenuBadgeCategory(n) === 'pantry')
      .map((n) => n.kind);
    const storesKinds = notifications
      .filter((n) => getNotificationMenuBadgeCategory(n) === 'stores')
      .map((n) => n.kind);

    assert.deepEqual(pantryKinds, ['pantry_running_low']);
    assert.deepEqual(storesKinds, ['price_alert']);
    assert.equal(countPantryNotificationBadge(notifications, {}), 1);
    assert.equal(countStoresNotificationBadge(notifications, {}), 1);
    assert.equal(countUnreadNotifications(notifications, {}), 2);
  });

  it('excludes read notifications from category badge counts', () => {
    const notifications = aggregateNotifications({
      priceAlerts: [
        {
          itemName: 'Milk',
          store: 'Kroger',
          oldPrice: 4.29,
          newPrice: 3.49,
          percentDrop: 18,
          emoji: '🥛',
        },
        {
          itemName: 'Eggs',
          store: 'Target',
          oldPrice: 3.99,
          newPrice: 2.99,
          percentDrop: 25,
          emoji: '🥚',
        },
      ],
      pantryItems: [pantryItem({ id: '1', name: 'Bread', status: 'running_low' })],
      receiptJobs: [],
      inAppQueue: [],
    });

    const priceAlert = notifications.find((n) => n.kind === 'price_alert');
    assert.ok(priceAlert);
    const readState = markNotificationsRead([priceAlert!], {});

    assert.equal(countStoresNotificationBadge(notifications, readState), 1);
    assert.equal(countPantryNotificationBadge(notifications, readState), 1);
  });

  it('dismisses a notification and filters it from the visible list', () => {
    const notification = buildPantryRunningLowNotification([
      pantryItem({ id: '1', name: 'Bread', status: 'running_low' }),
    ]);
    assert.ok(notification);

    const dismissedState = dismissNotification(notification!, {});
    assert.equal(isNotificationDismissed(notification!, dismissedState), true);

    const visible = filterDismissedNotifications([notification!], dismissedState);
    assert.equal(visible.length, 0);
  });

  it('re-shows dismissed pantry notification when fingerprint changes', () => {
    const original = buildPantryRunningLowNotification([
      pantryItem({ id: '1', name: 'Bread', status: 'running_low', quantity: 1 }),
    ]);
    assert.ok(original);

    const dismissedState = dismissNotification(original!, {});
    assert.equal(isNotificationDismissed(original!, dismissedState), true);

    const updated = buildPantryRunningLowNotification([
      pantryItem({ id: '1', name: 'Bread', status: 'running_low', quantity: 0 }),
    ]);
    assert.ok(updated);
    assert.equal(isNotificationDismissed(updated!, dismissedState), false);
    assert.equal(filterDismissedNotifications([updated!], dismissedState).length, 1);
  });

  it('dismisses all notifications in one action', () => {
    const notifications = aggregateNotifications({
      priceAlerts: [
        {
          itemName: 'Milk',
          store: 'Kroger',
          oldPrice: 4.29,
          newPrice: 3.49,
          percentDrop: 18,
          emoji: '🥛',
        },
      ],
      pantryItems: [pantryItem({ id: '1', name: 'Bread', status: 'running_low' })],
      receiptJobs: [],
      inAppQueue: [],
    });

    const dismissedState = dismissAllNotifications(notifications, {});
    const visible = filterDismissedNotifications(notifications, dismissedState);
    assert.equal(visible.length, 0);
    assert.equal(isNotificationDismissed(notifications[0]!, dismissedState), true);
  });
});
