import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolvePantryInsightAccess } from '@/src/services/pantryInsightAccessLogic';

describe('resolvePantryInsightAccess', () => {
  it('limits insights for free user in personal scope without personal Pro', () => {
    const access = resolvePantryInsightAccess({
      isAdmin: false,
      tier: 'free',
      activeScope: 'personal',
      hasPersonalPro: false,
      hasScopePro: true,
    });
    assert.equal(access.hasFullAccess, false);
  });

  it('grants full access for personal Pro in personal scope', () => {
    const access = resolvePantryInsightAccess({
      isAdmin: false,
      tier: 'pro',
      activeScope: 'personal',
      hasPersonalPro: true,
      hasScopePro: true,
    });
    assert.equal(access.hasFullAccess, true);
  });

  it('limits admin on free tier to preview monetization', () => {
    const access = resolvePantryInsightAccess({
      isAdmin: true,
      tier: 'free',
      activeScope: 'personal',
      hasPersonalPro: false,
      hasScopePro: false,
      forceFreePreview: false,
    });
    assert.equal(access.hasFullAccess, false);
    assert.equal(access.forceFreePreview, true);
  });

  it('limits admin with Pro when DEV free preview toggle is on', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = true;
    try {
      const access = resolvePantryInsightAccess({
        isAdmin: true,
        tier: 'pro',
        activeScope: 'personal',
        hasPersonalPro: true,
        hasScopePro: true,
        forceFreePreview: true,
      });
      assert.equal(access.hasFullAccess, false);
      assert.equal(access.forceFreePreview, true);
    } finally {
      global.__DEV__ = originalDev;
    }
  });

  it('grants full access for admin with Pro when preview is off', () => {
    const access = resolvePantryInsightAccess({
      isAdmin: true,
      tier: 'pro',
      activeScope: 'personal',
      hasPersonalPro: true,
      hasScopePro: true,
      forceFreePreview: false,
    });
    assert.equal(access.hasFullAccess, true);
  });
});
