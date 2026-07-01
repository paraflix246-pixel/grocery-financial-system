import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapWorkspaceJoinError,
  resolveJoinSuccessMessageKey,
} from '@/src/services/joinFamilyWorkspaceLogic';
import { WorkspaceJoinError } from '@/src/services/workspaceJoinErrors';

describe('mapWorkspaceJoinError', () => {
  it('maps known workspace join errors', () => {
    assert.equal(mapWorkspaceJoinError(new WorkspaceJoinError('INVALID_CODE', 'x')), 'INVALID_CODE');
    assert.equal(mapWorkspaceJoinError(new WorkspaceJoinError('NOT_SIGNED_IN', 'x')), 'NOT_SIGNED_IN');
    assert.equal(mapWorkspaceJoinError(new WorkspaceJoinError('NOT_FOUND', 'x')), 'NOT_FOUND');
    assert.equal(mapWorkspaceJoinError(new WorkspaceJoinError('ALREADY_OWNER', 'x')), 'ALREADY_OWNER');
  });

  it('falls back to generic for unknown errors', () => {
    assert.equal(mapWorkspaceJoinError(new Error('boom')), 'GENERIC');
  });
});

describe('resolveJoinSuccessMessageKey', () => {
  it('prefers already-member messaging', () => {
    assert.equal(
      resolveJoinSuccessMessageKey({
        groupId: 'ws1',
        code: 'ABCD-EFGH',
        workspaceName: 'Home',
        alreadyMember: true,
        subscriptionActive: true,
      }),
      'familyJoin.success.alreadyMember'
    );
  });

  it('warns when subscription is inactive', () => {
    assert.equal(
      resolveJoinSuccessMessageKey({
        groupId: 'ws1',
        code: 'ABCD-EFGH',
        workspaceName: 'Home',
        alreadyMember: false,
        subscriptionActive: false,
      }),
      'familyJoin.success.joinedNoSub'
    );
  });

  it('uses joined message when subscription is active', () => {
    assert.equal(
      resolveJoinSuccessMessageKey({
        groupId: 'ws1',
        code: 'ABCD-EFGH',
        workspaceName: 'Home',
        alreadyMember: false,
        subscriptionActive: true,
      }),
      'familyJoin.success.joined'
    );
  });
});
