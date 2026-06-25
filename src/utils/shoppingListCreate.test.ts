import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_NEW_LIST_NAME,
  migrateLegacyListNames,
  suggestNewListName,
} from '@/src/utils/shoppingListCreate';
import type { GroceryList } from '@/src/models/types';

function list(name: string, createdAt = '2026-01-01'): GroceryList {
  return {
    id: name,
    name,
    isActive: false,
    createdAt,
    updatedAt: createdAt,
  };
}

describe('suggestNewListName', () => {
  it('uses List 1 when no lists exist', () => {
    assert.equal(suggestNewListName([]), 'List 1');
    assert.equal(DEFAULT_NEW_LIST_NAME, 'List 1');
  });

  it('adds the next list number when lower numbers are taken', () => {
    assert.equal(suggestNewListName([list('List 1')]), 'List 2');
    assert.equal(suggestNewListName([list('List 1'), list('List 2')]), 'List 3');
    assert.equal(suggestNewListName([list('List 1'), list('List 3')]), 'List 2');
  });

  it('ignores custom names when picking the next number', () => {
    assert.equal(suggestNewListName([list('Costco run'), list('List 1')]), 'List 2');
  });
});

describe('migrateLegacyListNames', () => {
  it('renames Weekly Shopping to List 1', () => {
    const { lists, changed } = migrateLegacyListNames([list('Weekly Shopping')]);
    assert.equal(changed, true);
    assert.equal(lists[0].name, 'List 1');
  });

  it('renames My Shopping List variants to numbered lists in creation order', () => {
    const { lists, changed } = migrateLegacyListNames([
      list('My Shopping List', '2026-01-01'),
      list('My Shopping List 2', '2026-01-02'),
    ]);
    assert.equal(changed, true);
    assert.equal(lists[0].name, 'List 1');
    assert.equal(lists[1].name, 'List 2');
  });
});
