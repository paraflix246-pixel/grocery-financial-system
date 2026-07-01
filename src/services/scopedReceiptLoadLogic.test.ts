import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveScopedReceiptSource } from '@/src/services/scopedReceiptLoadLogic';

describe('resolveScopedReceiptSource', () => {
  it('loads personal receipts only from local storage', () => {
    assert.equal(resolveScopedReceiptSource('personal', null), 'personal_storage');
    assert.equal(resolveScopedReceiptSource('personal', 'ws-1'), 'personal_storage');
  });

  it('loads workspace receipts only from remote workspace storage', () => {
    assert.equal(resolveScopedReceiptSource('workspace', 'ws-1'), 'workspace_remote');
  });

  it('returns none when workspace scope has no workspace id', () => {
    assert.equal(resolveScopedReceiptSource('workspace', null), 'none');
  });
});
