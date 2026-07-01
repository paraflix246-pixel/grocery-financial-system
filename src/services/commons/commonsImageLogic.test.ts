import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCommonsApiUrl,
  buildCommonsSearchTerm,
  normalizeCommonsFoodTerm,
  parseCommonsSearchResponse,
  pickBestScoredCommonsPage,
  stripCommonsHtml,
} from '@/src/services/commons/commonsImageLogic';

describe('normalizeCommonsFoodTerm', () => {
  it('lowercases and collapses whitespace', () => {
    assert.equal(normalizeCommonsFoodTerm('  Whole   Milk '), 'whole milk');
  });
});

describe('buildCommonsSearchTerm', () => {
  it('appends food to bias toward food photography', () => {
    assert.equal(buildCommonsSearchTerm('bread'), 'bread food');
  });

  it('returns empty string for blank input', () => {
    assert.equal(buildCommonsSearchTerm('   '), '');
  });
});

describe('buildCommonsApiUrl', () => {
  it('builds a Wikimedia Commons search URL with required params', () => {
    const url = new URL(buildCommonsApiUrl({ searchTerm: 'milk food' }));
    assert.equal(url.origin + url.pathname, 'https://commons.wikimedia.org/w/api.php');
    assert.equal(url.searchParams.get('action'), 'query');
    assert.equal(url.searchParams.get('generator'), 'search');
    assert.equal(url.searchParams.get('gsrsearch'), 'milk food');
    assert.equal(url.searchParams.get('gsrnamespace'), '6');
    assert.equal(url.searchParams.get('prop'), 'imageinfo');
    assert.equal(url.searchParams.get('iiurlwidth'), '200');
  });
});

describe('stripCommonsHtml', () => {
  it('removes HTML tags and decodes common entities', () => {
    assert.equal(
      stripCommonsHtml('<a href="/wiki/User:Jane">Jane Doe</a> &amp; Co.'),
      'Jane Doe & Co.'
    );
  });
});

describe('parseCommonsSearchResponse', () => {
  it('returns null when pages are missing', () => {
    assert.equal(parseCommonsSearchResponse({}, 'bread'), null);
  });

  it('extracts thumbnail, attribution, and file page URL', () => {
    const image = parseCommonsSearchResponse(
      {
        query: {
          pages: {
            '123': {
              title: 'File:Fresh bread.jpg',
              imageinfo: [
                {
                  thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Fresh_bread.jpg/200px-Fresh_bread.jpg',
                  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Fresh_bread.jpg',
                  user: 'Baker42',
                  extmetadata: {
                    Artist: { value: '<a href="/wiki/User:Jane">Jane Doe</a>' },
                    LicenseShortName: { value: 'CC BY-SA 4.0' },
                  },
                },
              ],
            },
          },
        },
      },
      'bread'
    );

    assert.deepEqual(image, {
      term: 'bread',
      thumbnailUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Fresh_bread.jpg/200px-Fresh_bread.jpg',
      filePageUrl: 'https://commons.wikimedia.org/wiki/File:Fresh_bread.jpg',
      title: 'Fresh bread.jpg',
      author: 'Jane Doe',
      license: 'CC BY-SA 4.0',
    });
  });

  it('skips pages without thumbnail URLs', () => {
    const image = parseCommonsSearchResponse(
      {
        query: {
          pages: {
            '1': { title: 'File:NoImage.pdf', imageinfo: [{ descriptionurl: 'https://commons.wikimedia.org/wiki/File:NoImage.pdf' }] },
            '2': {
              title: 'File:Eggs.jpg',
              imageinfo: [
                {
                  thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eg/Eggs.jpg/200px-Eggs.jpg',
                  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Eggs.jpg',
                },
              ],
            },
          },
        },
      },
      'eggs'
    );

    assert.equal(image?.term, 'eggs');
    assert.match(image?.thumbnailUrl ?? '', /Eggs\.jpg/);
  });

  it('picks the highest-scored result instead of the first hit', () => {
    const best = pickBestScoredCommonsPage(
      {
        '1': {
          title: 'File:Croissant on white background.jpg',
          imageinfo: [
            {
              thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cr/Croissant.jpg/200px-Croissant.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Croissant.jpg',
            },
          ],
        },
        '2': {
          title: 'File:Loaf of bread.jpg',
          imageinfo: [
            {
              thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Loaf_of_bread.jpg/200px-Loaf_of_bread.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Loaf_of_bread.jpg',
            },
          ],
        },
      },
      'bread'
    );

    assert.match(best?.page.title ?? '', /Loaf of bread/);
  });

  it('returns null when the best search result is below the relevance threshold', () => {
    const image = parseCommonsSearchResponse(
      {
        query: {
          pages: {
            '1': {
              title: 'File:Random unrelated photo.jpg',
              imageinfo: [
                {
                  thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Random.jpg/200px-Random.jpg',
                  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Random.jpg',
                },
              ],
            },
          },
        },
      },
      'bread'
    );

    assert.equal(image, null);
  });
});
