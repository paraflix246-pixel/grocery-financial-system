type CacheEntry<T> = { value: T; expiresAt: number };

/** In-memory TTL cache for short-lived service results (e.g. price comparisons on focus). */
export function createTimedCache<T>(ttlMs: number) {
  const cache = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = cache.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T) {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    delete(key: string) {
      cache.delete(key);
    },
    clear() {
      cache.clear();
    },
  };
}
