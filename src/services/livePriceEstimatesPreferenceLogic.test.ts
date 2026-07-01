import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_LIVE_PRICE_ESTIMATES_ENABLED,
  applyLivePriceEstimatesDefaultsToAppSettings,
  isLivePriceEstimatesEnabled,
  normalizeLivePriceEstimatesPrefs,
} from '@/src/services/livePriceEstimatesPreferenceLogic';
import type { AppSettings } from '@/src/models/types';

function makeSettings(
  partial: Partial<AppSettings> = {}
): AppSettings {
  return {
    id: 'settings-1',
    displayName: '',
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
    enhancedCloudOcr: false,
    aiReceiptCleanup: true,
    communityPriceSharing: false,
    receiptImageStorage: 'ask_each_time',
    rememberReceiptImageChoice: false,
    showLivePriceEstimates: DEFAULT_LIVE_PRICE_ESTIMATES_ENABLED,
    updatedAt: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('livePriceEstimatesPreferenceLogic', () => {
  it('defaults live price estimates to enabled', () => {
    assert.equal(DEFAULT_LIVE_PRICE_ESTIMATES_ENABLED, true);
    assert.equal(isLivePriceEstimatesEnabled(null), true);
    assert.equal(isLivePriceEstimatesEnabled({}), true);
    assert.deepEqual(normalizeLivePriceEstimatesPrefs(null), {
      showLivePriceEstimates: true,
    });
  });

  it('respects explicit disabled preference', () => {
    assert.equal(isLivePriceEstimatesEnabled({ showLivePriceEstimates: false }), false);
  });

  it('applies defaults onto app settings', () => {
    const settings = applyLivePriceEstimatesDefaultsToAppSettings(
      makeSettings({ showLivePriceEstimates: undefined as unknown as boolean })
    );
    assert.equal(settings.showLivePriceEstimates, true);
  });
});
