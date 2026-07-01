import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { fetchValidatedCommonsFoodImage } from '@/src/services/commons/foodImageValidationService';

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_COMMONS_URL = process.env.EXPO_PUBLIC_COMMONS_API_URL;
const ORIGINAL_VALIDATE_URL = process.env.EXPO_PUBLIC_FOOD_IMAGE_VALIDATE_API_URL;

const sampleImage = {
  term: 'bread',
  thumbnailUrl:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Loaf_of_bread.jpg/200px-Loaf_of_bread.jpg',
  filePageUrl: 'https://commons.wikimedia.org/wiki/File:Loaf_of_bread.jpg',
};

describe('fetchValidatedCommonsFoodImage', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_COMMONS_API_URL = 'http://localhost:8081/api/commons';
    process.env.EXPO_PUBLIC_FOOD_IMAGE_VALIDATE_API_URL =
      'http://localhost:8081/api/food-image-validate';
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_COMMONS_URL === undefined) {
      delete process.env.EXPO_PUBLIC_COMMONS_API_URL;
    } else {
      process.env.EXPO_PUBLIC_COMMONS_API_URL = ORIGINAL_COMMONS_URL;
    }
    if (ORIGINAL_VALIDATE_URL === undefined) {
      delete process.env.EXPO_PUBLIC_FOOD_IMAGE_VALIDATE_API_URL;
    } else {
      process.env.EXPO_PUBLIC_FOOD_IMAGE_VALIDATE_API_URL = ORIGINAL_VALIDATE_URL;
    }
    mock.restoreAll();
  });

  it('returns null when vision rejects after commons fetch', async () => {
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/commons')) {
        return Response.json({ image: sampleImage });
      }
      if (url.includes('/api/food-image-validate')) {
        return Response.json({ approved: false, reason: 'vision-reject', tier: 'vision' });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const result = await fetchValidatedCommonsFoodImage('bread', { forceRefresh: true });
    assert.equal(result, null);
  });

  it('returns image when vision approves', async () => {
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/commons')) {
        return Response.json({ image: sampleImage });
      }
      if (url.includes('/api/food-image-validate')) {
        return Response.json({ approved: true, reason: 'vision-pass', tier: 'vision' });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const result = await fetchValidatedCommonsFoodImage('bread', { forceRefresh: true });
    assert.equal(result?.thumbnailUrl, sampleImage.thumbnailUrl);
  });

  it('skips vision when skipVision option is set', async () => {
    let validateCalls = 0;
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/commons')) {
        return Response.json({ image: sampleImage });
      }
      if (url.includes('/api/food-image-validate')) {
        validateCalls += 1;
        return Response.json({ approved: false, reason: 'vision-reject', tier: 'vision' });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch;

    const result = await fetchValidatedCommonsFoodImage('bread', {
      forceRefresh: true,
      skipVision: true,
    });
    assert.equal(result?.thumbnailUrl, sampleImage.thumbnailUrl);
    assert.equal(validateCalls, 0);
  });
});
