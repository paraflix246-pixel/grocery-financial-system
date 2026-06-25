import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GroceryList } from '@/src/models/types';
import { findDedicatedStoreBoundList } from '@/src/utils/storeListUtils';

function makeStoreList(
  id: string,
  storeId: string,
  storeName: string,
  layoutMode: GroceryList['layoutMode'] = 'store'
): GroceryList {
  const now = '2026-06-21T12:00:00Z';
  return {
    id,
    name: `${storeName} list`,
    isActive: false,
    storeId,
    storeName,
    layoutMode,
    createdAt: now,
    updatedAt: now,
  };
}

describe('findDedicatedStoreBoundList', () => {
  it('finds a store-bound list by store id', () => {
    const aldi = makeStoreList('aldi-list', 'aldi', 'Aldi');
    const found = findDedicatedStoreBoundList([aldi], { id: 'aldi', name: 'Aldi' });
    assert.equal(found?.id, 'aldi-list');
  });

  it('excludes the cart comparison source list', () => {
    const comparisonSource = makeStoreList('weekly', 'aldi', 'Aldi');
    const found = findDedicatedStoreBoundList([comparisonSource], { id: 'aldi', name: 'Aldi' }, {
      excludeListId: 'weekly',
    });
    assert.equal(found, undefined);
  });

  it('ignores category lists even when the name matches the store', () => {
    const now = '2026-06-21T12:00:00Z';
    const categoryList: GroceryList = {
      id: 'weekly',
      name: 'Aldi',
      isActive: true,
      layoutMode: 'category',
      createdAt: now,
      updatedAt: now,
    };
    const found = findDedicatedStoreBoundList([categoryList], { id: 'aldi', name: 'Aldi' });
    assert.equal(found, undefined);
  });
});
