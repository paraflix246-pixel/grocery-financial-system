import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canUseWorkspaceScope,
  isPersonalScope,
  isWorkspaceScope,
  resolveActiveScope,
  shouldSaveReceiptToPersonal,
  shouldSaveReceiptToWorkspace,
  shouldSyncPersonalSideEffects,
} from '@/src/services/dataScopeLogic';

describe('dataScopeLogic', () => {
  it('identifies personal vs workspace scope', () => {
    assert.equal(isPersonalScope('personal'), true);
    assert.equal(isPersonalScope('workspace'), false);
    assert.equal(isWorkspaceScope('workspace'), true);
    assert.equal(isWorkspaceScope('personal'), false);
  });

  it('falls back to personal when workspace access is unavailable', () => {
    assert.equal(resolveActiveScope('workspace', false), 'personal');
    assert.equal(resolveActiveScope('workspace', true), 'workspace');
    assert.equal(resolveActiveScope('personal', true), 'personal');
  });

  it('requires membership and active sub for workspace scope', () => {
    assert.equal(canUseWorkspaceScope(true, true), true);
    assert.equal(canUseWorkspaceScope(true, false), false);
    assert.equal(canUseWorkspaceScope(false, true), false);
    assert.equal(canUseWorkspaceScope(true, false, true), true);
  });

  it('keeps receipt persistence paths isolated', () => {
    assert.equal(shouldSaveReceiptToPersonal('personal'), true);
    assert.equal(shouldSaveReceiptToPersonal('workspace'), false);
    assert.equal(shouldSaveReceiptToWorkspace('workspace'), true);
    assert.equal(shouldSaveReceiptToWorkspace('personal'), false);
    assert.equal(shouldSyncPersonalSideEffects('personal'), true);
    assert.equal(shouldSyncPersonalSideEffects('workspace'), false);
  });
});
