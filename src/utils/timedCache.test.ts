import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTimedCache } from './timedCache';

describe('createTimedCache', () => {
  it('returns cached values before TTL expires', () => {
    const cache = createTimedCache<string>(60_000);
    cache.set('key', 'value');
    assert.equal(cache.get('key'), 'value');
  });

  it('expires entries after TTL', () => {
    const cache = createTimedCache<string>(10);
    cache.set('key', 'value');
    const originalNow = Date.now;
    Date.now = () => originalNow() + 20;
    try {
      assert.equal(cache.get('key'), undefined);
    } finally {
      Date.now = originalNow;
    }
  });

  it('clears all entries', () => {
    const cache = createTimedCache<number>(60_000);
    cache.set('a', 1);
    cache.clear();
    assert.equal(cache.get('a'), undefined);
  });
});
