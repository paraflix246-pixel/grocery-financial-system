import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isWorkspaceGatedFeature } from '@/src/services/featureGateLogic';
import { isWorkspaceSubscriptionActive } from '@/src/services/workspaceSubscriptionLogic';

describe('isWorkspaceGatedFeature', () => {
  it('treats family features as workspace-gated', () => {
    assert.equal(isWorkspaceGatedFeature('family_plans'), true);
    assert.equal(isWorkspaceGatedFeature('multi_user_sync'), true);
    assert.equal(isWorkspaceGatedFeature('export_advanced'), false);
  });
});

describe('isWorkspaceSubscriptionActive', () => {
  it('accepts active billing states', () => {
    assert.equal(isWorkspaceSubscriptionActive('active'), true);
    assert.equal(isWorkspaceSubscriptionActive('trialing'), true);
    assert.equal(isWorkspaceSubscriptionActive('inactive'), false);
    assert.equal(isWorkspaceSubscriptionActive('canceled'), false);
  });
});
