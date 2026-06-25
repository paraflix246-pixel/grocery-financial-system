import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GroceryList } from '@/src/models/types';
import { pickComparisonListId } from '@/src/services/listComparisonLogic';

function makeList(id: string, updatedAt: string, isActive = false): GroceryList {
  return {
    id,
    name: `List ${id}`,
    isActive,
    layoutMode: 'category',
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('pickComparisonListId', () => {
  it('prefers active list when it has items', () => {
    const active = makeList('active', '2026-06-21T12:00:00Z', true);
    const other = makeList('other', '2026-06-21T13:00:00Z');
    const id = pickComparisonListId([other, active], active, {
      active: 2,
      other: 5,
    });
    assert.equal(id, 'active');
  });

  it('falls back to most recent non-empty list when active is empty', () => {
    const active = makeList('active', '2026-06-21T14:00:00Z', true);
    const recent = makeList('recent', '2026-06-21T13:00:00Z');
    const older = makeList('older', '2026-06-21T10:00:00Z');
    const id = pickComparisonListId([active, recent, older], active, {
      active: 0,
      recent: 3,
      older: 1,
    });
    assert.equal(id, 'recent');
  });

  it('returns null when every list is empty', () => {
    const active = makeList('active', '2026-06-21T12:00:00Z', true);
    const id = pickComparisonListId([active], active, { active: 0 });
    assert.equal(id, null);
  });

  it('uses first non-empty list when no active list is set', () => {
    const recent = makeList('recent', '2026-06-21T13:00:00Z');
    const id = pickComparisonListId([recent], null, { recent: 2 });
    assert.equal(id, 'recent');
  });
});
