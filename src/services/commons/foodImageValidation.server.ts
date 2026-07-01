import {
  buildFoodImageVisionCacheKey,
  type FoodImageValidationResult,
} from '@/src/services/commons/foodImageValidationLogic';
import { createTimedCache } from '@/src/utils/timedCache';

const OPENAI_VISION_MODEL = process.env.OPENAI_FOOD_IMAGE_MODEL?.trim() || 'gpt-4o-mini';
const VISION_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

function isDevLogEnabled(): boolean {
  return typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
}

type VisionCacheValue = {
  clear: boolean;
  confidence: number;
};

const visionCache = createTimedCache<VisionCacheValue>(VISION_CACHE_MS);

export function resetFoodImageVisionCacheForTests(): void {
  visionCache.clear();
}

export function isFoodImageVisionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

type VisionApiResponse = {
  clear?: boolean;
  confidence?: number;
};

function parseVisionApiResponse(payload: unknown): VisionCacheValue | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as VisionApiResponse;
  if (typeof record.clear !== 'boolean') return null;

  const confidence =
    typeof record.confidence === 'number' && Number.isFinite(record.confidence)
      ? Math.min(1, Math.max(0, record.confidence))
      : record.clear
        ? 0.75
        : 0.25;

  return { clear: record.clear, confidence };
}

async function callOpenAiFoodImageVision(input: {
  apiKey: string;
  imageUrl: string;
  term: string;
}): Promise<VisionCacheValue | null> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You validate grocery product photos for a shopping app thumbnail. Reply with JSON only: {"clear": boolean, "confidence": number between 0 and 1}. Set clear=true ONLY when the image is a recognizable photo of the requested food item that is clearly visible: well-lit, in focus, and not blurry, dark, or heavily obscured. Reject images where the food is too small to identify, out of focus, underexposed, mostly covered, or not the requested item.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Is this a clear, visible photo of "${input.term}" suitable for a grocery app? The food must be identifiable and the image must not be blurry or too dark. Answer with JSON {"clear": true/false, "confidence": 0-1}.`,
            },
            {
              type: 'image_url',
              image_url: { url: input.imageUrl, detail: 'low' },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    console.warn('OpenAI food image validation failed:', response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) return null;

  try {
    return parseVisionApiResponse(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function validateFoodImageWithVisionServer(input: {
  imageUrl: string;
  term: string;
}): Promise<FoodImageValidationResult> {
  const imageUrl = input.imageUrl.trim();
  const term = input.term.trim();
  if (!imageUrl || !term) {
    return { approved: false, reason: 'missing-thumbnail', tier: 'heuristic' };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { approved: true, reason: 'vision-unavailable', tier: 'vision' };
  }

  const cacheKey = buildFoodImageVisionCacheKey(imageUrl, term);
  const cached = visionCache.get(cacheKey);
  if (cached) {
    if (isDevLogEnabled()) {
      console.log(
        `[food-image-vision] cache ${cached.clear ? 'pass' : 'reject'} "${term}" conf=${cached.confidence.toFixed(2)}`
      );
    }
    return cached.clear
      ? { approved: true, reason: 'vision-pass', tier: 'vision' }
      : { approved: false, reason: 'vision-reject', tier: 'vision' };
  }

  const vision = await callOpenAiFoodImageVision({ apiKey, imageUrl, term });
  if (!vision) {
    if (isDevLogEnabled()) {
      console.log(`[food-image-vision] unavailable for "${term}" (OpenAI call failed)`);
    }
    return { approved: true, reason: 'vision-unavailable', tier: 'vision' };
  }

  visionCache.set(cacheKey, vision);
  if (isDevLogEnabled()) {
    console.log(
      `[food-image-vision] ${vision.clear ? 'pass' : 'reject'} "${term}" conf=${vision.confidence.toFixed(2)}`
    );
  }
  return vision.clear
    ? { approved: true, reason: 'vision-pass', tier: 'vision' }
    : { approved: false, reason: 'vision-reject', tier: 'vision' };
}
