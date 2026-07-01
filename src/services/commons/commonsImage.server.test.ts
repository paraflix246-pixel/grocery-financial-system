import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import {
  resetCommonsImageServerForTests,
  searchCommonsFoodImage,
} from '@/src/services/commons/commonsImage.server';
import { isEmojiOnlyFoodKey } from '@/src/services/commons/foodImageValidationLogic';

const ORIGINAL_FETCH = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function curatedBreadFileResponse() {
  return jsonResponse({
    query: {
      pages: {
        '101931119': {
          title: 'File:Loaf of bread.jpg',
          imageinfo: [
            {
              thumburl:
                'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Loaf_of_bread.jpg/200px-Loaf_of_bread.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Loaf_of_bread.jpg',
              extmetadata: {
                LicenseShortName: { value: 'CC BY-SA 4.0' },
                Artist: { value: 'Example Author' },
              },
            },
          ],
        },
      },
    },
  });
}

describe('searchCommonsFoodImage', () => {
  beforeEach(() => {
    resetCommonsImageServerForTests();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    resetCommonsImageServerForTests();
    mock.restoreAll();
  });

  it('returns null for blank terms without calling the API', async () => {
    let fetchCalls = 0;
    globalThis.fetch = mock.fn(async () => {
      fetchCalls += 1;
      return jsonResponse({});
    }) as typeof fetch;

    const image = await searchCommonsFoodImage({ term: '   ' });
    assert.equal(image, null);
    assert.equal(fetchCalls, 0);
  });

  it('returns null for emoji-only chicken breast without calling the API', async () => {
    assert.equal(isEmojiOnlyFoodKey('chicken breast'), true);

    let fetchCalls = 0;
    globalThis.fetch = mock.fn(async () => {
      fetchCalls += 1;
      return jsonResponse({});
    }) as typeof fetch;

    const image = await searchCommonsFoodImage({ term: 'chicken breast' });
    assert.equal(image, null);
    assert.equal(fetchCalls, 0);
  });

  it('returns curated bread as a loaf, not a croissant search hit', async () => {
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.match(url, /commons\.wikimedia\.org\/w\/api\.php/);
      assert.match(url, /titles=File%3ALoaf\+of\+bread\.jpg|titles=File:Loaf\+of\+bread\.jpg/);
      return curatedBreadFileResponse();
    }) as typeof fetch;

    const image = await searchCommonsFoodImage({ term: 'bread' });
    assert.equal(image?.term, 'bread');
    assert.match(image?.thumbnailUrl ?? '', /Loaf_of_bread\.jpg/);
    assert.equal(image?.filePageUrl, 'https://commons.wikimedia.org/wiki/File:Loaf_of_bread.jpg');
    assert.equal(image?.license, 'CC BY-SA 4.0');
  });

  it('falls back to scored Commons search when curated and Wikipedia miss', async () => {
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('wikipedia.org/api/rest_v1/page/summary/')) {
        return jsonResponse({ title: 'Dragon fruit' }, 404);
      }

      if (url.includes('titles=File%3A') || url.includes('titles=File:')) {
        return jsonResponse({
          query: {
            pages: {
              '-1': { title: 'File:Missing.jpg', missing: '' },
            },
          },
        });
      }

      assert.match(url, /gsrsearch=dragon\+fruit\+food/);
      return jsonResponse({
        query: {
          pages: {
            '42': {
              title: 'File:Dragon fruit whole.jpg',
              imageinfo: [
                {
                  thumburl:
                    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dr/Dragon_fruit.jpg/200px-Dragon_fruit.jpg',
                  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Dragon_fruit.jpg',
                },
              ],
            },
          },
        },
      });
    }) as typeof fetch;

    const image = await searchCommonsFoodImage({ term: 'dragon fruit' });
    assert.equal(image?.term, 'dragon fruit');
    assert.match(image?.thumbnailUrl ?? '', /Dragon_fruit\.jpg/);
  });

  it('uses the server cache for repeated lookups', async () => {
    let fetchCalls = 0;
    globalThis.fetch = mock.fn(async (input: RequestInfo | URL) => {
      fetchCalls += 1;
      const url = String(input);
      if (url.includes('titles=File')) {
        return curatedBreadFileResponse();
      }
      return jsonResponse({});
    }) as typeof fetch;

    const first = await searchCommonsFoodImage({ term: 'bread' });
    const second = await searchCommonsFoodImage({ term: 'Bread' });
    assert.equal(fetchCalls, 1);
    assert.equal(first?.term, 'bread');
    assert.equal(second?.term, 'bread');
  });
});
