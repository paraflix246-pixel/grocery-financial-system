import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseFamilyListSnapshot } from '@/src/services/familyListSnapshot';

describe('parseFamilyListSnapshot', () => {
  it('parses a valid snapshot', () => {
    const snapshot = parseFamilyListSnapshot(
      JSON.stringify({
        version: 1,
        listName: 'Shared Groceries',
        items: [{ name: 'Milk', quantity: 2, category: 'Dairy' }],
      })
    );
    assert.equal(snapshot.listName, 'Shared Groceries');
    assert.equal(snapshot.items.length, 1);
    assert.equal(snapshot.items[0].name, 'Milk');
  });

  it('throws when items array is missing', () => {
    assert.throws(
      () => parseFamilyListSnapshot(JSON.stringify({ listName: 'Broken' })),
      /items array/
    );
  });

  it('throws on invalid JSON', () => {
    assert.throws(() => parseFamilyListSnapshot('{not json'));
  });
});
