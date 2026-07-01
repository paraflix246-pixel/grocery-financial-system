import { normalizeCommonsFoodTerm } from '@/src/services/commons/commonsImageLogic';
import type { CommonsFoodImage } from '@/src/services/commons/commonsImageTypes';
import { resolveCuratedItemKey } from '@/src/services/commons/curatedFoodImages';

/** Tier A: always show emoji, skip Wikimedia fetch entirely. */
export const EMOJI_ONLY_FOOD_KEYS = ['chicken breast', 'chicken'] as const;

/** Tier B: curated pins that should fall back to emoji even when a URL exists. */
export const LOW_CONFIDENCE_CURATED_KEYS = ['chicken breast'] as const;

export const MIN_THUMBNAIL_DIMENSION_PX = 80;

export type FoodImageValidationTier = 'emoji-only' | 'heuristic' | 'vision' | 'load-failure';

export type FoodImageValidationReason =
  | 'emoji-only-key'
  | 'missing-thumbnail'
  | 'thumbnail-too-small'
  | 'low-confidence-curated'
  | 'heuristic-pass'
  | 'vision-reject'
  | 'vision-pass'
  | 'vision-unavailable';

export type FoodImageValidationResult = {
  approved: boolean;
  reason: FoodImageValidationReason;
  tier: FoodImageValidationTier;
};

export function isEmojiOnlyFoodKey(term: string): boolean {
  const normalized = normalizeCommonsFoodTerm(term);
  if (!normalized) return false;

  if (normalized === 'chicken breast' || normalized.includes('chicken breast')) {
    return true;
  }

  if (normalized === 'chicken') {
    return true;
  }

  return (EMOJI_ONLY_FOOD_KEYS as readonly string[]).includes(normalized);
}

export function parseThumbnailWidthFromUrl(thumbnailUrl: string): number | null {
  const pxMatch = thumbnailUrl.match(/\/(\d+)px-/);
  if (pxMatch) {
    const width = Number.parseInt(pxMatch[1], 10);
    return Number.isFinite(width) ? width : null;
  }

  try {
    const url = new URL(thumbnailUrl);
    const widthParam = url.searchParams.get('width');
    if (widthParam) {
      const width = Number.parseInt(widthParam, 10);
      return Number.isFinite(width) ? width : null;
    }
  } catch {
    // ignore invalid URLs in tests
  }

  return null;
}

export function isLowConfidenceCuratedKey(term: string): boolean {
  const curatedKey = resolveCuratedItemKey(term);
  if (!curatedKey) return false;
  return (LOW_CONFIDENCE_CURATED_KEYS as readonly string[]).includes(curatedKey);
}

export function validateFoodImageHeuristic(
  image: CommonsFoodImage | null,
  term: string
): FoodImageValidationResult {
  if (isEmojiOnlyFoodKey(term)) {
    return { approved: false, reason: 'emoji-only-key', tier: 'emoji-only' };
  }

  if (!image?.thumbnailUrl?.trim()) {
    return { approved: false, reason: 'missing-thumbnail', tier: 'heuristic' };
  }

  if (isLowConfidenceCuratedKey(term)) {
    return { approved: false, reason: 'low-confidence-curated', tier: 'heuristic' };
  }

  const width = parseThumbnailWidthFromUrl(image.thumbnailUrl);
  if (width !== null && width < MIN_THUMBNAIL_DIMENSION_PX) {
    return { approved: false, reason: 'thumbnail-too-small', tier: 'heuristic' };
  }

  return { approved: true, reason: 'heuristic-pass', tier: 'heuristic' };
}

export function buildFoodImageVisionCacheKey(imageUrl: string, term: string): string {
  return `${normalizeCommonsFoodTerm(term)}::${imageUrl.trim()}`;
}
