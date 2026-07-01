import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ListItem } from '@/src/models/types';
import { buildComparisonListSignature } from '@/src/hooks/useRotatingItemComparisonLogic';

function makeItem(id: string, listId: string, name: string): ListItem {
  return {
    id,
    listId,
    name,
    expectedPrice: 0,
    quantity: 1,
    category: 'Groceries',
    sortOrder: 0,
  };
}

describe('buildComparisonListSignature', () => {
  it('matches identical item content across different array instances', () => {
    const listId = '__watchlist_comparison__';
    const a = [
      makeItem('a-1', listId, 'Milk'),
      makeItem('a-2', listId, 'Bread'),
    ];
    const b = [
      makeItem('a-1', listId, 'Milk'),
      makeItem('a-2', listId, 'Bread'),
    ];

    assert.notEqual(a, b);
    assert.equal(buildComparisonListSignature(a), buildComparisonListSignature(b));
  });

  it('changes when item fields change', () => {
    const listId = '__watchlist_comparison__';
    const base = [makeItem('a-1', listId, 'Milk')];
    const renamed = [makeItem('a-1', listId, 'Whole Milk')];

    assert.notEqual(buildComparisonListSignature(base), buildComparisonListSignature(renamed));
  });

  it('includes quantity and store preference in the signature', () => {
    const listId = '__watchlist_comparison__';
    const oneQty = [makeItem('a-1', listId, 'Milk')];
    const twoQty = [{ ...makeItem('a-1', listId, 'Milk'), quantity: 2 }];
    const preferred = [{ ...makeItem('a-1', listId, 'Milk'), storePreference: 'Kroger' }];

    assert.notEqual(buildComparisonListSignature(oneQty), buildComparisonListSignature(twoQty));
    assert.notEqual(buildComparisonListSignature(oneQty), buildComparisonListSignature(preferred));
  });
});
