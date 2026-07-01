import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Receipt } from '@/src/models/types';
import {
  filterPersonalReceipts,
  receiptBelongsToOwner,
  resolveLegacyReceiptClaim,
  scopedReceiptStorageCacheKey,
} from '@/src/services/personalReceiptScopeLogic';

function sampleReceipt(id: string, ownerUserId?: string): Receipt {
  return {
    id,
    storeName: 'Walmart',
    date: '2026-06-29',
    total: 10,
    imageUri: '',
    userCorrected: false,
    createdAt: '2026-06-29T00:00:00.000Z',
    updatedAt: '2026-06-29T00:00:00.000Z',
    ownerUserId,
  };
}

describe('personalReceiptScope', () => {
  it('scopes cache keys by user so account switches do not reuse receipt lists', () => {
    const personalA = scopedReceiptStorageCacheKey('personal', null, 'user-a');
    const personalB = scopedReceiptStorageCacheKey('personal', null, 'user-b');
    assert.notEqual(personalA, personalB);
    assert.equal(scopedReceiptStorageCacheKey('workspace', 'ws-1', 'user-a'), 'workspace:ws-1');
  });

  it('filters personal receipts to the active owner only', () => {
    const receipts = [
      sampleReceipt('a', 'user-a'),
      sampleReceipt('b', 'user-b'),
      sampleReceipt('c', 'user-a'),
    ];
    const scoped = filterPersonalReceipts(receipts, 'user-a');
    assert.deepEqual(
      scoped.map((receipt) => receipt.id),
      ['a', 'c']
    );
  });

  it('treats ownership as strict equality', () => {
    assert.equal(receiptBelongsToOwner('user-a', 'user-a'), true);
    assert.equal(receiptBelongsToOwner('user-b', 'user-a'), false);
    assert.equal(receiptBelongsToOwner(undefined, 'user-a'), false);
    assert.equal(receiptBelongsToOwner(null, 'user-a'), false);
  });

  it('claims legacy unowned receipts for the first active user only', () => {
    assert.deepEqual(resolveLegacyReceiptClaim('user-a', null, 2), {
      action: 'assign',
      ownerId: 'user-a',
    });
    assert.deepEqual(resolveLegacyReceiptClaim('user-a', 'user-a', 1), {
      action: 'assign',
      ownerId: 'user-a',
    });
    assert.deepEqual(resolveLegacyReceiptClaim('user-b', 'user-a', 1), {
      action: 'skip',
      reason: 'not_legacy_owner',
    });
    assert.deepEqual(resolveLegacyReceiptClaim('user-a', null, 0), { action: 'none' });
  });
});
