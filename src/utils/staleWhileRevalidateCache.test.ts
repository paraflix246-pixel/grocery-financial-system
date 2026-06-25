import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createStaleWhileRevalidateCache } from './staleWhileRevalidateCache';

describe('createStaleWhileRevalidateCache', () => {
  it('returns fresh entries before stale threshold', () => {
    const cache = createStaleWhileRevalidateCache<string>(60_000);
    cache.set('key', 'value');
    const entry = cache.get('key');
    assert.ok(entry);
    assert.equal(entry.value, 'value');
    assert.equal(entry.isStale, false);
  });

  it('marks entries stale but still returns them after threshold', () => {
    const cache = createStaleWhileRevalidateCache<string>(10);
    const originalNow = Date.now;
    Date.now = () => originalNow() + 20;
    try {
      cache.set('key', 'value', originalNow());
      const entry = cache.get('key');
      assert.ok(entry);
      assert.equal(entry.value, 'value');
      assert.equal(entry.isStale, true);
    } finally {
      Date.now = originalNow;
    }
  });

  it('clears all entries', () => {
    const cache = createStaleWhileRevalidateCache<number>(60_000);
    cache.set('a', 1);
    cache.clear();
    assert.equal(cache.get('a'), undefined);
  });
});
