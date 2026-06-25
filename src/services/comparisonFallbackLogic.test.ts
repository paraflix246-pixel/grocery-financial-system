import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ListItem } from '@/src/models/types';
import {
  buildSearchComparisonItem,
  buildSyntheticListItemsFromTracked,
  COMPARISON_FALLBACK_LIST_ID,
  COMPARISON_STARTER_LIST_ID,
  ensureHomeComparisonItems,
  HOME_CART_COMPARISON_PREVIEW_COUNT,
} from '@/src/services/comparisonFallbackLogic';

describe('comparisonFallbackLogic', () => {
  it('builds synthetic list items from tracked entries', () => {
    const items = buildSyntheticListItemsFromTracked([
      {
        slug: 'Eggs',
        name: 'Eggs',
        emoji: '🥚',
        source: 'alert',
        alertRuleIds: ['r1'],
      },
    ]);

    assert.equal(items.length, 1);
    assert.equal(items[0].name, 'Eggs');
    assert.equal(items[0].id, `${COMPARISON_FALLBACK_LIST_ID}-Eggs`);
    assert.equal(items[0].listId, COMPARISON_FALLBACK_LIST_ID);
    assert.equal(items[0].quantity, 1);
    assert.equal(items[0].sortOrder, 0);
  });

  it('builds a searchable comparison item from a typed name', () => {
    const item = buildSearchComparisonItem({ itemName: 'Organic Chicken', category: 'Meat' });
    assert.equal(item.name, 'Organic Chicken');
    assert.equal(item.category, 'Meat');
    assert.equal(item.quantity, 1);
    assert.match(item.id, /search-organic-chicken/);
  });

  it('reuses an existing list item when provided', () => {
    const listItem: ListItem = {
      id: 'li-1',
      listId: 'list-1',
      name: 'MILK 4L',
      expectedPrice: 0,
      quantity: 2,
      category: 'Dairy',
      sortOrder: 0,
    };
    assert.equal(buildSearchComparisonItem({ itemName: 'ignored', listItem }), listItem);
  });

  it('pads home preview items to two staples when only one item exists', () => {
    const items = ensureHomeComparisonItems([
      {
        id: 'li-milk',
        listId: 'list-1',
        name: 'Milk',
        expectedPrice: 0,
        quantity: 1,
        category: 'Dairy',
        sortOrder: 0,
      },
    ]);

    assert.equal(items.length, HOME_CART_COMPARISON_PREVIEW_COUNT);
    assert.equal(items[0].name, 'Milk');
    assert.equal(items[1].name, 'Bread');
  });

  it('creates starter demo items when the list is empty', () => {
    const items = ensureHomeComparisonItems([]);
    assert.equal(items.length, HOME_CART_COMPARISON_PREVIEW_COUNT);
    assert.equal(items[0].name, 'Milk');
    assert.equal(items[1].name, 'Bread');
    assert.equal(items[0].listId, COMPARISON_STARTER_LIST_ID);
  });
});
