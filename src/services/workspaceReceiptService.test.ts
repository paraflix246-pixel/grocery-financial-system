import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getWorkspaceReceiptSaveBlocker,
  workspaceReceiptSaveErrorMessage,
} from '@/src/services/workspaceReceiptSaveLogic';

describe('getWorkspaceReceiptSaveBlocker', () => {
  const ready = {
    scope: 'workspace' as const,
    userId: 'user-1',
    workspaceId: 'ws-uuid',
    hasSupabase: true,
    isMember: true,
    hasActiveSub: true,
  };

  it('allows save when membership and subscription are active', () => {
    assert.equal(getWorkspaceReceiptSaveBlocker(ready), null);
  });

  it('blocks non-workspace save scope', () => {
    assert.equal(
      getWorkspaceReceiptSaveBlocker({ ...ready, scope: 'personal' }),
      'wrong_scope'
    );
  });

  it('blocks when user is not signed in', () => {
    assert.equal(getWorkspaceReceiptSaveBlocker({ ...ready, userId: null }), 'not_signed_in');
  });

  it('blocks when no workspace is selected', () => {
    assert.equal(getWorkspaceReceiptSaveBlocker({ ...ready, workspaceId: null }), 'no_workspace');
  });

  it('blocks local-only household workspaces', () => {
    assert.equal(
      getWorkspaceReceiptSaveBlocker({ ...ready, workspaceId: 'local_ws_abcd1234' }),
      'local_workspace'
    );
  });

  it('blocks when Supabase is not configured', () => {
    assert.equal(getWorkspaceReceiptSaveBlocker({ ...ready, hasSupabase: false }), 'no_supabase');
  });

  it('blocks non-members even with an active subscription', () => {
    assert.equal(
      getWorkspaceReceiptSaveBlocker({ ...ready, isMember: false, hasActiveSub: true }),
      'not_member'
    );
  });

  it('blocks members without an active household subscription', () => {
    assert.equal(
      getWorkspaceReceiptSaveBlocker({ ...ready, isMember: true, hasActiveSub: false }),
      'no_subscription'
    );
  });

  it('does not require workspace UI scope for members with access', () => {
    assert.equal(getWorkspaceReceiptSaveBlocker(ready), null);
  });
});

describe('workspaceReceiptSaveErrorMessage', () => {
  it('includes database detail when provided', () => {
    assert.match(
      workspaceReceiptSaveErrorMessage('database_error', 'permission denied'),
      /permission denied/
    );
  });

  it('returns a friendly message for local-only households', () => {
    assert.match(workspaceReceiptSaveErrorMessage('local_workspace'), /Supabase/i);
  });
});
