import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Workspace, WorkspaceMember } from '@/src/models/workspace';
import {
  hasProInCurrentScope,
  hasWorkspaceFeatureInCurrentScope,
  isWorkspaceOwner,
  type ProScopeContext,
} from '@/src/services/featureGateScopeLogic';

const workspace: Workspace = {
  id: 'ws-1',
  name: 'Test Household',
  ownerUserId: 'owner-1',
  inviteCode: 'abc',
  stripeSubscriptionId: 'sub_1',
  subscriptionStatus: 'active',
  subscriptionPlan: 'monthly',
  currentPeriodEnd: null,
  createdAt: '',
  updatedAt: '',
};

const members: WorkspaceMember[] = [
  { workspaceId: 'ws-1', userId: 'owner-1', role: 'owner', displayName: null, joinedAt: '' },
  { workspaceId: 'ws-1', userId: 'member-1', role: 'member', displayName: null, joinedAt: '' },
];

function ctx(overrides: Partial<ProScopeContext>): ProScopeContext {
  return {
    activeScope: 'personal',
    isWorkspaceOwner: false,
    isCurrentMember: false,
    hasActiveWorkspaceSub: false,
    hasPersonalPro: false,
    ...overrides,
  };
}

describe('isWorkspaceOwner', () => {
  it('detects owner by workspace ownerUserId', () => {
    assert.equal(isWorkspaceOwner('owner-1', workspace, members), true);
    assert.equal(isWorkspaceOwner('member-1', workspace, members), false);
  });

  it('detects owner by member role', () => {
    const altMembers: WorkspaceMember[] = [
      { workspaceId: 'ws-1', userId: 'owner-1', role: 'owner', displayName: null, joinedAt: '' },
    ];
    assert.equal(isWorkspaceOwner('owner-1', { ...workspace, ownerUserId: '' }, altMembers), true);
  });
});

describe('hasProInCurrentScope', () => {
  it('grants leader Pro on personal and workspace with family sub', () => {
    const leader = ctx({
      isWorkspaceOwner: true,
      isCurrentMember: true,
      hasActiveWorkspaceSub: true,
    });
    assert.equal(hasProInCurrentScope({ ...leader, activeScope: 'personal' }), true);
    assert.equal(hasProInCurrentScope({ ...leader, activeScope: 'workspace' }), true);
  });

  it('grants member Pro only in workspace scope', () => {
    const member = ctx({
      isCurrentMember: true,
      hasActiveWorkspaceSub: true,
    });
    assert.equal(hasProInCurrentScope({ ...member, activeScope: 'workspace' }), true);
    assert.equal(hasProInCurrentScope({ ...member, activeScope: 'personal' }), false);
  });

  it('keeps standalone personal Pro outside any household', () => {
    assert.equal(
      hasProInCurrentScope(ctx({ hasPersonalPro: true, isCurrentMember: false })),
      true
    );
  });

  it('does not grant member personal Pro on personal scope', () => {
    assert.equal(
      hasProInCurrentScope(
        ctx({
          hasPersonalPro: true,
          isCurrentMember: true,
          activeScope: 'personal',
        })
      ),
      false
    );
  });

  it('grants leader personal Pro everywhere even without family sub', () => {
    assert.equal(
      hasProInCurrentScope(
        ctx({
          hasPersonalPro: true,
          isWorkspaceOwner: true,
          isCurrentMember: true,
          activeScope: 'personal',
        })
      ),
      true
    );
  });
});

describe('hasWorkspaceFeatureInCurrentScope', () => {
  it('allows leader from personal scope', () => {
    assert.equal(
      hasWorkspaceFeatureInCurrentScope(
        ctx({
          isWorkspaceOwner: true,
          isCurrentMember: true,
          hasActiveWorkspaceSub: true,
          activeScope: 'personal',
        })
      ),
      true
    );
  });

  it('requires workspace scope for members', () => {
    const base = ctx({ isCurrentMember: true, hasActiveWorkspaceSub: true });
    assert.equal(hasWorkspaceFeatureInCurrentScope({ ...base, activeScope: 'workspace' }), true);
    assert.equal(hasWorkspaceFeatureInCurrentScope({ ...base, activeScope: 'personal' }), false);
  });
});
