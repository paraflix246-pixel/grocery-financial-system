import type { CommonsFoodImageSearchResponse } from '@/src/services/commons/commonsImageTypes';
import { resolvePublicServiceUrl } from '@/src/utils/productionEnvGuard';

function getCommonsApiUrl(): string | null {
  return resolvePublicServiceUrl(
    process.env.EXPO_PUBLIC_COMMONS_API_URL,
    'EXPO_PUBLIC_COMMONS_API_URL',
    '/api/commons'
  );
}

export async function searchCommonsFoodImageClient(input: {
  term: string;
}): Promise<CommonsFoodImageSearchResponse> {
  const url = getCommonsApiUrl();
  if (!url) {
    return { image: null, error: 'Commons API URL is not configured.' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'search', term: input.term }),
    });

    const payload = (await response.json()) as CommonsFoodImageSearchResponse & { error?: string };
    if (!response.ok) {
      return {
        image: null,
        error: payload.error ?? `Commons image search failed (${response.status})`,
      };
    }

    return { image: payload.image ?? null };
  } catch (error) {
    return {
      image: null,
      error: error instanceof Error ? error.message : 'Commons image search request failed.',
    };
  }
}
