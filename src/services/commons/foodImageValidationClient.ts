import type { FoodImageValidationResult } from '@/src/services/commons/foodImageValidationLogic';
import { resolvePublicServiceUrl } from '@/src/utils/productionEnvGuard';

function getFoodImageValidateApiUrl(): string | null {
  return resolvePublicServiceUrl(
    process.env.EXPO_PUBLIC_FOOD_IMAGE_VALIDATE_API_URL,
    'EXPO_PUBLIC_FOOD_IMAGE_VALIDATE_API_URL',
    '/api/food-image-validate'
  );
}

export async function validateFoodImageWithVisionClient(input: {
  imageUrl: string;
  term: string;
}): Promise<FoodImageValidationResult> {
  const url = getFoodImageValidateApiUrl();
  if (!url) {
    return { approved: true, reason: 'vision-unavailable', tier: 'vision' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: input.imageUrl,
        term: input.term,
      }),
    });

    const payload = (await response.json()) as FoodImageValidationResult & { error?: string };
    if (!response.ok) {
      return { approved: true, reason: 'vision-unavailable', tier: 'vision' };
    }

    if (typeof payload.approved === 'boolean' && payload.reason && payload.tier) {
      return {
        approved: payload.approved,
        reason: payload.reason,
        tier: payload.tier,
      };
    }

    return { approved: true, reason: 'vision-unavailable', tier: 'vision' };
  } catch {
    return { approved: true, reason: 'vision-unavailable', tier: 'vision' };
  }
}
