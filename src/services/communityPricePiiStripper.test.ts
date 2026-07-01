import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  containsCommunityPii,
  sanitizeProductNameForCommunity,
  stripReceiptItemsForCommunity,
} from '@/src/services/communityPricePiiStripper';
import {
  resolveReceiptImageUriForSave,
  resolveSavedReceiptStorageChoice,
  shouldAskReceiptStorageChoice,
} from '@/src/services/privacyPreferencesLogic';
import type { AppSettings } from '@/src/models/types';

function baseSettings(overrides: Partial<AppSettings> = {}): AppSettings {
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
    updatedAt: '2026-06-30T00:00:00.000Z',
    ...overrides,
  };
}

describe('communityPricePiiStripper', () => {
  it('blocks loyalty and receipt id lines', () => {
    assert.equal(containsCommunityPii('Member #1234567890'), true);
    assert.equal(containsCommunityPii('Receipt #ABC12345678'), true);
    assert.equal(containsCommunityPii('Organic Whole Milk 1 gal'), false);
  });

  it('strips card numbers from product names', () => {
    const cleaned = sanitizeProductNameForCommunity('Milk 4532 1234 5678 9010');
    assert.equal(cleaned.includes('4532'), false);
  });

  it('returns only anonymized pricing fields', () => {
    const rows = stripReceiptItemsForCommunity(
      [
        { name: 'Bananas', price: 1.29, quantity: 1 },
        { name: 'Member #9988776655', price: 2.5 },
      ],
      { storeName: 'Walmart', city: 'Austin', state: 'TX' },
      '2026-06-01',
      '2026-06-30'
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.item_name, 'bananas');
    assert.equal(rows[0]?.store_name, 'Walmart');
    assert.equal(rows[0]?.store_state, 'TX');
    assert.equal(rows[0]?.store_city, 'Austin');
  });

  it('excludes items with customer PII labels', () => {
    const rows = stripReceiptItemsForCommunity(
      [{ name: 'Customer: Jane Doe', price: 3.99 }],
      { storeName: 'Target' },
      '2026-06-01',
      '2026-06-30'
    );
    assert.equal(rows.length, 0);
  });
});

describe('privacyPreferencesService', () => {
  it('asks each time until a remembered choice exists', () => {
    assert.equal(shouldAskReceiptStorageChoice(baseSettings()), true);
    assert.equal(
      shouldAskReceiptStorageChoice(
        baseSettings({ rememberReceiptImageChoice: true, receiptImageStorage: 'data_only' })
      ),
      false
    );
  });

  it('resolves saved storage choice', () => {
    assert.equal(
      resolveSavedReceiptStorageChoice(
        baseSettings({ rememberReceiptImageChoice: true, receiptImageStorage: 'data_only' })
      ),
      'data_only'
    );
  });

  it('drops image uri when data only is selected', () => {
    assert.equal(
      resolveReceiptImageUriForSave('file:///receipt.jpg', 'data_only'),
      ''
    );
    assert.equal(
      resolveReceiptImageUriForSave('file:///receipt.jpg', 'image_and_data'),
      'file:///receipt.jpg'
    );
  });
});
