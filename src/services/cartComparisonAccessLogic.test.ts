import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveCartComparisonAccess,
  resolveCartComparisonScopeProAccess,
} from '@/src/services/cartComparisonAccessLogic';

describe('resolveCartComparisonAccess', () => {
  it('grants full access to admin without dev free preview', () => {
    const access = resolveCartComparisonAccess({
      isAdmin: true,
      tier: 'pro',
      subscriptionSource: 'free',
      hasPersonalProScope: false,
      forceFreeCartPreview: false,
    });
    assert.equal(access.hasFullAccess, true);
    assert.equal(access.accessReason, 'admin');
  });

  it('forces free preview for admin with dev tier free in DEV', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = true;
    try {
      const access = resolveCartComparisonAccess({
        isAdmin: true,
        tier: 'free',
        subscriptionSource: 'free',
        hasPersonalProScope: false,
      });
      assert.equal(access.hasFullAccess, false);
      assert.equal(access.accessReason, 'dev_free_preview');
      assert.equal(access.forceFreePreview, true);
    } finally {
      global.__DEV__ = originalDev;
    }
  });

  it('forces free preview when explicit dev toggle is on', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = true;
    try {
      const access = resolveCartComparisonAccess({
        isAdmin: true,
        tier: 'pro',
        subscriptionSource: 'paid',
        hasPersonalProScope: true,
        forceFreeCartPreview: true,
      });
      assert.equal(access.hasFullAccess, false);
      assert.equal(access.accessReason, 'dev_free_preview');
    } finally {
      global.__DEV__ = originalDev;
    }
  });

  it('denies full access for guest free users', () => {
    const access = resolveCartComparisonAccess({
      isAdmin: false,
      tier: 'free',
      subscriptionSource: 'free',
      hasPersonalProScope: false,
      forceFreeCartPreview: false,
    });
    assert.equal(access.hasFullAccess, false);
    assert.equal(access.accessReason, 'free');
  });

  it('grants full access for signed-in pro users', () => {
    const access = resolveCartComparisonAccess({
      isAdmin: false,
      tier: 'pro',
      subscriptionSource: 'paid',
      hasPersonalProScope: true,
      forceFreeCartPreview: false,
    });
    assert.equal(access.hasFullAccess, true);
    assert.equal(access.accessReason, 'pro');
  });

  it('grants full access during pro trial', () => {
    const access = resolveCartComparisonAccess({
      isAdmin: false,
      tier: 'pro',
      subscriptionSource: 'trial',
      hasPersonalProScope: true,
      forceFreeCartPreview: false,
    });
    assert.equal(access.hasFullAccess, true);
    assert.equal(access.accessReason, 'trial');
  });

  it('grants full access via family workspace scope', () => {
    const access = resolveCartComparisonAccess({
      isAdmin: false,
      tier: 'free',
      subscriptionSource: 'free',
      hasPersonalProScope: true,
      activeScope: 'workspace',
      hasPersonalPro: false,
      hasScopePro: true,
      forceFreeCartPreview: false,
    });
    assert.equal(access.hasFullAccess, true);
    assert.equal(access.accessReason, 'family');
  });

  it('denies full access in personal scope when only household sub grants scope pro', () => {
    const access = resolveCartComparisonAccess({
      isAdmin: false,
      tier: 'free',
      subscriptionSource: 'free',
      hasPersonalProScope: false,
      activeScope: 'personal',
      hasPersonalPro: false,
      hasScopePro: true,
      forceFreeCartPreview: false,
    });
    assert.equal(access.hasFullAccess, false);
    assert.equal(access.accessReason, 'free');
  });

  it('grants full access in personal scope with personal pro subscription', () => {
    const access = resolveCartComparisonAccess({
      isAdmin: false,
      tier: 'pro',
      subscriptionSource: 'paid',
      hasPersonalProScope: true,
      activeScope: 'personal',
      hasPersonalPro: true,
      hasScopePro: true,
      forceFreeCartPreview: false,
    });
    assert.equal(access.hasFullAccess, true);
    assert.equal(access.accessReason, 'pro');
  });
});

describe('resolveCartComparisonScopeProAccess', () => {
  it('uses personal pro only in personal scope', () => {
    assert.equal(
      resolveCartComparisonScopeProAccess({
        activeScope: 'personal',
        hasPersonalPro: false,
        hasScopePro: true,
      }),
      false
    );
    assert.equal(
      resolveCartComparisonScopeProAccess({
        activeScope: 'personal',
        hasPersonalPro: true,
        hasScopePro: false,
      }),
      true
    );
  });

  it('uses scope pro in workspace scope', () => {
    assert.equal(
      resolveCartComparisonScopeProAccess({
        activeScope: 'workspace',
        hasPersonalPro: false,
        hasScopePro: true,
      }),
      true
    );
    assert.equal(
      resolveCartComparisonScopeProAccess({
        activeScope: 'workspace',
        hasPersonalPro: true,
        hasScopePro: false,
      }),
      false
    );
  });
});
