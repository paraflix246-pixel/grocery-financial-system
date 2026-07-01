import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_NOTIFICATION_PREFS,
  shouldSendNotificationType,
} from '@/src/services/notificationPreferenceLogic';

describe('notification guard matrix', () => {
  it('requires master switch for every type', () => {
    for (const type of [
      'price_drop',
      'price_change',
      'sale',
      'cheaper_store',
      'budget',
      'weekly_summary',
      'family_list',
      'pantry_low',
      'household_receipt',
    ] as const) {
      assert.equal(
        shouldSendNotificationType(type, {
          ...DEFAULT_NOTIFICATION_PREFS,
          pushNotificationsEnabled: false,
        }),
        false,
        type
      );
    }
  });

  it('matches recommended defaults for optional household alerts', () => {
    assert.equal(shouldSendNotificationType('weekly_summary', DEFAULT_NOTIFICATION_PREFS), false);
    assert.equal(shouldSendNotificationType('pantry_low', DEFAULT_NOTIFICATION_PREFS), false);
    assert.equal(
      shouldSendNotificationType('household_receipt', DEFAULT_NOTIFICATION_PREFS),
      false
    );
    assert.equal(shouldSendNotificationType('family_list', DEFAULT_NOTIFICATION_PREFS), true);
    assert.equal(shouldSendNotificationType('cheaper_store', DEFAULT_NOTIFICATION_PREFS), true);
  });
});
