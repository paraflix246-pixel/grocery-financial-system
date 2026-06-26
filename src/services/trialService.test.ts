import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  computeTrialStatus,
  TRIAL_DURATION_DAYS,
} from '@/src/services/trialService';
import {
  getTrialReminderLevel,
  trialBannerMessage,
} from '@/src/services/trialReminderService';
import { effectiveSubscriptionTier } from '@/src/constants/tierLimitsConfig';

describe('computeTrialStatus', () => {
  const start = new Date('2026-06-01T12:00:00.000Z');

  it('returns inactive when no trial started', () => {
    const status = computeTrialStatus(null);
    assert.equal(status.active, false);
    assert.equal(status.expired, false);
    assert.equal(status.daysRemaining, 0);
  });

  it('is active on day one with full days remaining', () => {
    const now = new Date('2026-06-01T18:00:00.000Z');
    const status = computeTrialStatus(start.toISOString(), now);
    assert.equal(status.active, true);
    assert.equal(status.expired, false);
    assert.ok(status.daysRemaining >= 6);
  });

  it('counts down days remaining near the end', () => {
    const now = new Date('2026-06-07T12:00:00.000Z');
    const status = computeTrialStatus(start.toISOString(), now);
    assert.equal(status.active, true);
    assert.equal(status.daysRemaining, 1);
  });

  it('expires after TRIAL_DURATION_DAYS', () => {
    const now = new Date('2026-06-09T00:00:00.000Z');
    const status = computeTrialStatus(start.toISOString(), now);
    assert.equal(status.active, false);
    assert.equal(status.expired, true);
    assert.equal(status.daysRemaining, 0);
  });

  it('marks invalid timestamps as expired', () => {
    const status = computeTrialStatus('not-a-date');
    assert.equal(status.active, false);
    assert.equal(status.expired, true);
  });
});

describe('trial reminders', () => {
  const start = new Date('2026-06-01T12:00:00.000Z');

  it('shows banner from day 5 onward', () => {
    const day5 = new Date('2026-06-05T12:00:00.000Z');
    assert.equal(getTrialReminderLevel(start.toISOString(), day5), 'banner');
  });

  it('shows modal on day 6 and 7', () => {
    const day6 = new Date('2026-06-06T12:00:00.000Z');
    const day7 = new Date('2026-06-07T12:00:00.000Z');
    assert.equal(getTrialReminderLevel(start.toISOString(), day6), 'modal');
    assert.equal(getTrialReminderLevel(start.toISOString(), day7), 'modal');
  });

  it('formats banner copy with pluralization', () => {
    assert.match(trialBannerMessage(2), /2 days/);
    assert.match(trialBannerMessage(1), /1 day/);
  });
});

describe('effectiveSubscriptionTier with trial tier', () => {
  it('maps pro tier to pro limits during trial', () => {
    assert.equal(effectiveSubscriptionTier('pro'), 'pro');
    assert.equal(TRIAL_DURATION_DAYS, 7);
  });
});
