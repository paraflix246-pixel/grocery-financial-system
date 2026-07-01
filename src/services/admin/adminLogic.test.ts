import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeAbuseHeuristics,
  computeUserHealthScore,
  escapeCsvValue,
  isFeatureFlagEnabled,
  mergeFeatureFlags,
  normalizeAlertSettings,
  resolveStripeMode,
  rowsToCsv,
} from '@/src/services/admin/adminLogic';

describe('computeUserHealthScore', () => {
  it('combines activity, receipts, and subscription', () => {
    assert.equal(
      computeUserHealthScore({ activityScore: 80, receiptCount: 5, subscriptionStatus: 'active' }),
      75
    );
    assert.equal(
      computeUserHealthScore({ activityScore: 0, receiptCount: 0, subscriptionStatus: null }),
      0
    );
  });
});

describe('resolveStripeMode', () => {
  it('detects test and live keys', () => {
    assert.equal(resolveStripeMode('sk_test_abc'), 'test');
    assert.equal(resolveStripeMode('sk_live_abc'), 'live');
    assert.equal(resolveStripeMode(undefined), 'unknown');
  });
});

describe('isFeatureFlagEnabled', () => {
  it('returns true only when flag is explicitly true', () => {
    assert.equal(isFeatureFlagEnabled({ receipt_scanning_paused: true }, 'receipt_scanning_paused'), true);
    assert.equal(isFeatureFlagEnabled({ receipt_scanning_paused: false }, 'receipt_scanning_paused'), false);
    assert.equal(isFeatureFlagEnabled({}, 'receipt_scanning_paused'), false);
  });
});

describe('rowsToCsv', () => {
  it('escapes commas and quotes', () => {
    const csv = rowsToCsv(['email', 'note'], [['a@b.com', 'hello, "world"']]);
    assert.match(csv, /"hello, ""world"""/);
  });
});

describe('escapeCsvValue', () => {
  it('wraps values with special characters', () => {
    assert.equal(escapeCsvValue('plain'), 'plain');
    assert.equal(escapeCsvValue('a,b'), '"a,b"');
  });
});

describe('computeAbuseHeuristics', () => {
  it('passes through heuristic counts', () => {
    assert.deepEqual(
      computeAbuseHeuristics({
        bannedCount: 2,
        pastDueCount: 1,
        signupsLast24h: 5,
        signupsLastHour: 3,
        openFeedback: 4,
        highVolumeEmailDomains: 1,
      }),
      {
        bannedAccounts: 2,
        pastDueSubscriptions: 1,
        signupsLast24h: 5,
        signupsLastHour: 3,
        openFeedback: 4,
        highVolumeEmailDomains: 1,
      }
    );
  });
});

describe('mergeFeatureFlags', () => {
  it('merges boolean flag patches', () => {
    assert.deepEqual(
      mergeFeatureFlags({ receipt_scanning_paused: false }, { new_signups_paused: true }),
      { receipt_scanning_paused: false, new_signups_paused: true }
    );
  });
});

describe('normalizeAlertSettings', () => {
  it('normalizes alert settings shape', () => {
    assert.deepEqual(
      normalizeAlertSettings({
        email: ' admin@example.com ',
        slackWebhook: 'https://hooks.slack.com/test',
        thresholds: { errorRatePercent: 5, pastDueCount: 2 },
      }),
      {
        email: 'admin@example.com',
        slackWebhook: 'https://hooks.slack.com/test',
        thresholds: { errorRatePercent: 5, pastDueCount: 2, churnRiskCount: undefined },
      }
    );
  });
});
