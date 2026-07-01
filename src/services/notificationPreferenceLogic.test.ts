import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  classifyPriceAlertTypes,
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefs,
  shouldNotifyPantryLowTransition,
  shouldSendNotificationType,
} from '@/src/services/notificationPreferenceLogic';

describe('normalizeNotificationPrefs', () => {
  it('applies recommended defaults for optional types', () => {
    const prefs = normalizeNotificationPrefs({});
    assert.equal(prefs.notifyWeeklySummaryAlerts, false);
    assert.equal(prefs.notifyPantryLowAlerts, false);
    assert.equal(prefs.notifyHouseholdReceiptAlerts, false);
    assert.equal(prefs.notifyPriceAlerts, true);
    assert.equal(prefs.notifyCheaperStoreAlerts, true);
  });

  it('preserves explicit overrides', () => {
    const prefs = normalizeNotificationPrefs({
      notifyWeeklySummaryAlerts: true,
      notifyPantryLowAlerts: true,
    });
    assert.equal(prefs.notifyWeeklySummaryAlerts, true);
    assert.equal(prefs.notifyPantryLowAlerts, true);
  });
});

describe('shouldSendNotificationType', () => {
  it('blocks all types when master push switch is off', () => {
    assert.equal(
      shouldSendNotificationType('price_drop', {
        ...DEFAULT_NOTIFICATION_PREFS,
        pushNotificationsEnabled: false,
        notifyPriceAlerts: true,
      }),
      false
    );
  });

  it('respects per-type toggles', () => {
    assert.equal(
      shouldSendNotificationType('weekly_summary', {
        ...DEFAULT_NOTIFICATION_PREFS,
        notifyWeeklySummaryAlerts: false,
      }),
      false
    );
    assert.equal(
      shouldSendNotificationType('weekly_summary', {
        ...DEFAULT_NOTIFICATION_PREFS,
        notifyWeeklySummaryAlerts: true,
      }),
      true
    );
  });

  it('allows family list alerts by default', () => {
    assert.equal(shouldSendNotificationType('family_list', DEFAULT_NOTIFICATION_PREFS), true);
  });
});

describe('classifyPriceAlertTypes', () => {
  it('treats custom rule hits as price drops only', () => {
    assert.deepEqual(
      classifyPriceAlertTypes({ percentDrop: 0, source: 'custom', targetPrice: 2.99 }),
      ['price_drop']
    );
  });

  it('classifies large drops as drop, sale, and change', () => {
    const types = classifyPriceAlertTypes({ percentDrop: 20, source: 'history' });
    assert.ok(types.includes('price_drop'));
    assert.ok(types.includes('sale'));
    assert.ok(types.includes('price_change'));
  });

  it('classifies small drops as price change only', () => {
    assert.deepEqual(classifyPriceAlertTypes({ percentDrop: 2, source: 'history' }), [
      'price_change',
    ]);
  });
});

describe('shouldNotifyPantryLowTransition', () => {
  it('fires only on transition into running low', () => {
    assert.equal(shouldNotifyPantryLowTransition(false, true), true);
    assert.equal(shouldNotifyPantryLowTransition(true, true), false);
    assert.equal(shouldNotifyPantryLowTransition(false, false), false);
  });
});
