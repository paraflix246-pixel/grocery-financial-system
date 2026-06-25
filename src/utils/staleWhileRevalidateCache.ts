type SwrEntry<T> = { value: T; fetchedAt: number };

export type SwrLookup<T> = { value: T; fetchedAt: number; isStale: boolean };

/** In-memory cache that marks entries stale after `staleAfterMs` but still returns them. */
export function createStaleWhileRevalidateCache<T>(staleAfterMs: number) {
  const cache = new Map<string, SwrEntry<T>>();

  return {
    get(key: string): SwrLookup<T> | undefined {
      const entry = cache.get(key);
      if (!entry) return undefined;
      return {
        value: entry.value,
        fetchedAt: entry.fetchedAt,
        isStale: Date.now() - entry.fetchedAt > staleAfterMs,
      };
    },
    set(key: string, value: T, fetchedAt = Date.now()) {
      cache.set(key, { value, fetchedAt });
    },
    delete(key: string) {
      cache.delete(key);
    },
    clear() {
      cache.clear();
    },
    keys(): string[] {
      return [...cache.keys()];
    },
    isStale(fetchedAt: number): boolean {
      return Date.now() - fetchedAt > staleAfterMs;
    },
  };
}
