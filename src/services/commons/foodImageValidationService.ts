import { fetchCommonsFoodImage } from '@/src/services/commons/commonsImageService';
import type { CommonsFoodImage } from '@/src/services/commons/commonsImageTypes';
import { validateFoodImageWithVisionClient } from '@/src/services/commons/foodImageValidationClient';
import {
  isEmojiOnlyFoodKey,
  validateFoodImageHeuristic,
} from '@/src/services/commons/foodImageValidationLogic';

export async function fetchValidatedCommonsFoodImage(
  term: string,
  options?: { forceRefresh?: boolean; skipVision?: boolean }
): Promise<CommonsFoodImage | null> {
  const trimmed = term.trim();
  if (!trimmed) return null;

  if (isEmojiOnlyFoodKey(trimmed)) {
    return null;
  }

  const image = await fetchCommonsFoodImage(trimmed, options);
  const heuristic = validateFoodImageHeuristic(image, trimmed);
  if (!heuristic.approved || !image) {
    return null;
  }

  if (options?.skipVision) {
    return image;
  }

  const vision = await validateFoodImageWithVisionClient({
    imageUrl: image.thumbnailUrl,
    term: trimmed,
  });

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(
      `[food-image] vision ${vision.approved ? 'pass' : 'reject'} (${vision.reason}) for "${trimmed}"`
    );
  }

  if (!vision.approved) {
    return null;
  }

  return image;
}
