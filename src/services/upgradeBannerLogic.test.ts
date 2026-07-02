import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldShowProUpgradeBanner } from '@/src/services/upgradeBannerLogic';

describe('shouldShowProUpgradeBanner', () => {
  it('shows for guests and free users without scope Pro', () => {
    assert.equal(shouldShowProUpgradeBanner({ isAdmin: false, scopePro: false }), true);
  });

  it('hides for admins with Pro scope and paid tier', () => {
    assert.equal(
      shouldShowProUpgradeBanner({ isAdmin: true, scopePro: true, tier: 'pro' }),
      false
    );
  });

  it('hides for admins without scope Pro when tier is not free', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = false;
    try {
      assert.equal(shouldShowProUpgradeBanner({ isAdmin: true, scopePro: false, tier: 'pro' }), false);
    } finally {
      global.__DEV__ = originalDev;
    }
  });

  it('shows for admin on free tier in production', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = false;
    try {
      assert.equal(shouldShowProUpgradeBanner({ isAdmin: true, scopePro: false, tier: 'free' }), true);
      assert.equal(shouldShowProUpgradeBanner({ isAdmin: true, scopePro: true, tier: 'free' }), true);
    } finally {
      global.__DEV__ = originalDev;
    }
  });

  it('shows for admin on free tier in DEV (matches cart comparison preview)', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = true;
    try {
      assert.equal(shouldShowProUpgradeBanner({ isAdmin: true, scopePro: false, tier: 'free' }), true);
    } finally {
      global.__DEV__ = originalDev;
    }
  });

  it('shows when explicit DEV free preview toggle is on', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = true;
    try {
      assert.equal(
        shouldShowProUpgradeBanner({
          isAdmin: true,
          scopePro: true,
          tier: 'pro',
          forceFreePreview: true,
        }),
        true
      );
    } finally {
      global.__DEV__ = originalDev;
    }
  });

  it('hides when scope Pro is active (Pro, trial, or family workspace)', () => {
    assert.equal(shouldShowProUpgradeBanner({ isAdmin: false, scopePro: true }), false);
  });
});
