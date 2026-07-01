import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import {
  resetFoodImageVisionCacheForTests,
  validateFoodImageWithVisionServer,
} from '@/src/services/commons/foodImageValidation.server';

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_OPENAI_KEY = process.env.OPENAI_API_KEY;

describe('validateFoodImageWithVisionServer', () => {
  beforeEach(() => {
    resetFoodImageVisionCacheForTests();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    if (ORIGINAL_OPENAI_KEY === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = ORIGINAL_OPENAI_KEY;
    }
    resetFoodImageVisionCacheForTests();
    mock.restoreAll();
  });

  it('skips vision when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    let fetchCalls = 0;
    globalThis.fetch = mock.fn(async () => {
      fetchCalls += 1;
      return new Response('{}');
    }) as typeof fetch;

    const result = await validateFoodImageWithVisionServer({
      imageUrl: 'https://example.com/bread.jpg',
      term: 'bread',
    });

    assert.equal(result.approved, true);
    assert.equal(result.reason, 'vision-unavailable');
    assert.equal(fetchCalls, 0);
  });

  it('approves clear images from OpenAI vision', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    globalThis.fetch = mock.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({ clear: true, confidence: 0.92 }),
            },
          },
        ],
      })
    ) as typeof fetch;

    const result = await validateFoodImageWithVisionServer({
      imageUrl: 'https://example.com/bread.jpg',
      term: 'bread',
    });

    assert.equal(result.approved, true);
    assert.equal(result.reason, 'vision-pass');
  });

  it('rejects unclear images from OpenAI vision', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    globalThis.fetch = mock.fn(async () =>
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({ clear: false, confidence: 0.2 }),
            },
          },
        ],
      })
    ) as typeof fetch;

    const result = await validateFoodImageWithVisionServer({
      imageUrl: 'https://example.com/chicken.jpg',
      term: 'chicken breast',
    });

    assert.equal(result.approved, false);
    assert.equal(result.reason, 'vision-reject');
  });

  it('caches vision results for repeated lookups', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    let fetchCalls = 0;
    globalThis.fetch = mock.fn(async () => {
      fetchCalls += 1;
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({ clear: true, confidence: 0.95 }),
            },
          },
        ],
      });
    }) as typeof fetch;

    const input = {
      imageUrl: 'https://example.com/bread.jpg',
      term: 'bread',
    };

    const first = await validateFoodImageWithVisionServer(input);
    const second = await validateFoodImageWithVisionServer(input);

    assert.equal(first.approved, true);
    assert.equal(second.approved, true);
    assert.equal(fetchCalls, 1);
  });
});
