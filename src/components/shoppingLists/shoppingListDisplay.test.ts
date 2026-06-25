import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GroceryList } from '@/src/models/types';
import {
  buildListDifferentiator,
  getListItemCount,
  partitionLists,
} from '@/src/components/shoppingLists/shoppingListDisplay';

function makeList(overrides: Partial<GroceryList> & Pick<GroceryList, 'id' | 'name'>): GroceryList {
  return {
    isActive: false,
    createdAt: '2026-01-01',
    updatedAt: '2026-06-01',
    ...overrides,
  };
}

describe('shoppingListDisplay', () => {
  it('partitions active, populated, and empty lists', () => {
    const lists = [
      makeList({ id: 'a', name: 'Active', isActive: true, updatedAt: '2026-06-03' }),
      makeList({ id: 'b', name: 'Full', updatedAt: '2026-06-02' }),
      makeList({ id: 'c', name: 'Empty', updatedAt: '2026-06-01' }),
    ];
    const itemsByList = {
      b: [{ id: '1' }],
      c: [],
    };

    const result = partitionLists(lists, 'a', itemsByList);

    assert.equal(result.activeList?.id, 'a');
    assert.deepEqual(
      result.populatedLists.map((list) => list.id),
      ['b']
    );
    assert.deepEqual(
      result.emptyLists.map((list) => list.id),
      ['c']
    );
  });

  it('adds differentiator when names collide', () => {
    const lists = [
      makeList({ id: '1', name: 'Weekly Shopping', updatedAt: '2026-06-01' }),
      makeList({ id: '2', name: 'Weekly Shopping', updatedAt: '2026-06-10', createdAt: '2026-05-01' }),
    ];

    const subtitle = buildListDifferentiator(lists[1], lists, 3);
    assert.match(subtitle ?? '', /3 items/);
    assert.match(subtitle ?? '', /Updated/);
  });

  it('counts items per list', () => {
    assert.equal(getListItemCount('x', { x: [{ id: '1' }, { id: '2' }] }), 2);
    assert.equal(getListItemCount('missing', {}), 0);
  });
});
