import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWikipediaSummaryUrl,
  extractCommonsFileTitleFromUploadUrl,
  parseWikipediaSummaryResponse,
} from '@/src/services/commons/wikipediaImage.server';

describe('buildWikipediaSummaryUrl', () => {
  it('builds a REST summary URL with title case', () => {
    assert.equal(
      buildWikipediaSummaryUrl('bread'),
      'https://en.wikipedia.org/api/rest_v1/page/summary/Bread'
    );
    assert.equal(
      buildWikipediaSummaryUrl('chicken breast'),
      'https://en.wikipedia.org/api/rest_v1/page/summary/Chicken_as_food'
    );
  });
});

describe('extractCommonsFileTitleFromUploadUrl', () => {
  it('extracts file names from Wikimedia thumbnail URLs', () => {
    assert.equal(
      extractCommonsFileTitleFromUploadUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Loaf_of_bread.jpg/250px-Loaf_of_bread.jpg'
      ),
      'Loaf of bread.jpg'
    );
  });
});

describe('parseWikipediaSummaryResponse', () => {
  it('maps a Wikipedia lead image to a CommonsFoodImage', () => {
    const image = parseWikipediaSummaryResponse(
      {
        title: 'Bread',
        description: 'staple food',
        thumbnail: {
          source:
            'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Loaf_of_bread.jpg/320px-Loaf_of_bread.jpg',
        },
        originalimage: {
          source: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Loaf_of_bread.jpg',
        },
        content_urls: {
          desktop: {
            page: 'https://en.wikipedia.org/wiki/Bread',
          },
        },
      },
      'bread'
    );

    assert.deepEqual(image, {
      term: 'bread',
      thumbnailUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Loaf_of_bread.jpg/320px-Loaf_of_bread.jpg',
      filePageUrl: 'https://commons.wikimedia.org/wiki/File:Loaf_of_bread.jpg',
      title: 'Loaf of bread.jpg',
      author: 'Wikipedia — staple food',
      license: 'Wikipedia',
    });
  });

  it('returns null when no thumbnail is present', () => {
    assert.equal(parseWikipediaSummaryResponse({ title: 'Bread' }, 'bread'), null);
  });

  it('returns null when the lead image fails relevance checks', () => {
    assert.equal(
      parseWikipediaSummaryResponse(
        {
          title: 'Butter',
          description: 'dairy product',
          thumbnail: {
            source:
              'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Croissant_example.JPG/320px-Croissant_example.JPG',
          },
          originalimage: {
            source: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Croissant_example.JPG',
          },
        },
        'butter'
      ),
      null
    );
  });
});
