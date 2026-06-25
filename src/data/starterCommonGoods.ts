import { POPULAR_ITEM_NAMES } from '@/src/data/groceryCatalog';
import { getItemEmoji } from '@/src/data/commonGroceryItems';
import type { TrackedItemEntry } from '@/src/services/priceTrackerLogic';
import { toTrackedItemSlug } from '@/src/services/priceTrackerLogic';

/** Default sample items shown before the user scans a receipt or sets alerts. */
export const DEFAULT_STARTER_ITEM_COUNT = 8;

/** Curated pool of common grocery items for onboarding placeholders. */
export const STARTER_ITEM_POOL: readonly string[] = POPULAR_ITEM_NAMES;

export const STARTER_SAMPLE_HINT = 'Sample prices';

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable pseudo-random pick from the starter pool for a given seed string. */
export function pickStarterItemNames(
  pool: readonly string[],
  count: number,
  seed: string
): string[] {
  const limit = Math.max(1, Math.min(count, pool.length));
  const rand = seededRandom(hashSeed(seed));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, limit);
}

/** Fixed seed for deterministic tests and synchronous fallbacks. */
export function buildStarterItemSeed(): string {
  return 'smartcart-starter-v1';
}

/** Synchronous starter set for tests and non-persisted fallbacks. */
export function getStarterCommonGoods(count = DEFAULT_STARTER_ITEM_COUNT): TrackedItemEntry[] {
  const names = pickStarterItemNames(STARTER_ITEM_POOL, count, buildStarterItemSeed());
  return names.map((name, index) => ({
    slug: toTrackedItemSlug(name),
    name,
    emoji: getItemEmoji(name),
    source: 'starter' as const,
    alertRuleIds: [],
    sortOrder: index,
  }));
}