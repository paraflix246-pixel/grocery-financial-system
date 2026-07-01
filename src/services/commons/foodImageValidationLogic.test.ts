import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CommonsFoodImage } from '@/src/services/commons/commonsImageTypes';
import {
  EMOJI_ONLY_FOOD_KEYS,
  isEmojiOnlyFoodKey,
  parseThumbnailWidthFromUrl,
  validateFoodImageHeuristic,
} from '@/src/services/commons/foodImageValidationLogic';

describe('EMOJI_ONLY_FOOD_KEYS', () => {
  it('includes chicken breast and chicken', () => {
    assert.deepEqual([...EMOJI_ONLY_FOOD_KEYS], ['chicken breast', 'chicken']);
  });
});

describe('isEmojiOnlyFoodKey', () => {
  it('matches chicken breast variants', () => {
    assert.equal(isEmojiOnlyFoodKey('Chicken Breast'), true);
    assert.equal(isEmojiOnlyFoodKey('boneless chicken breast'), true);
  });

  it('matches exact chicken only', () => {
    assert.equal(isEmojiOnlyFoodKey('chicken'), true);
    assert.equal(isEmojiOnlyFoodKey('Chicken'), true);
  });

  it('does not match unrelated chicken products', () => {
    assert.equal(isEmojiOnlyFoodKey('chicken eggs'), false);
    assert.equal(isEmojiOnlyFoodKey('chicken broth'), false);
  });

  it('does not match other staples', () => {
    assert.equal(isEmojiOnlyFoodKey('bread'), false);
    assert.equal(isEmojiOnlyFoodKey(''), false);
  });
});

describe('parseThumbnailWidthFromUrl', () => {
  it('reads Commons /200px- path segments', () => {
    assert.equal(
      parseThumbnailWidthFromUrl(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Fresh_bread.jpg/200px-Fresh_bread.jpg'
      ),
      200
    );
  });

  it('reads width query params', () => {
    assert.equal(parseThumbnailWidthFromUrl('https://example.com/thumb.jpg?width=120'), 120);
  });

  it('returns null when width is unknown', () => {
    assert.equal(parseThumbnailWidthFromUrl('https://example.com/image.jpg'), null);
  });
});

describe('validateFoodImageHeuristic', () => {
  const sampleImage: CommonsFoodImage = {
    term: 'bread',
    thumbnailUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Loaf_of_bread.jpg/200px-Loaf_of_bread.jpg',
    filePageUrl: 'https://commons.wikimedia.org/wiki/File:Loaf_of_bread.jpg',
  };

  it('rejects emoji-only keys before inspecting the image', () => {
    const result = validateFoodImageHeuristic(sampleImage, 'chicken breast');
    assert.equal(result.approved, false);
    assert.equal(result.reason, 'emoji-only-key');
    assert.equal(result.tier, 'emoji-only');
  });

  it('rejects missing thumbnails', () => {
    const result = validateFoodImageHeuristic(null, 'bread');
    assert.equal(result.approved, false);
    assert.equal(result.reason, 'missing-thumbnail');
  });

  it('rejects very small thumbnails', () => {
    const tiny: CommonsFoodImage = {
      ...sampleImage,
      thumbnailUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Loaf_of_bread.jpg/60px-Loaf_of_bread.jpg',
    };
    const result = validateFoodImageHeuristic(tiny, 'bread');
    assert.equal(result.approved, false);
    assert.equal(result.reason, 'thumbnail-too-small');
  });

  it('approves normal curated thumbnails', () => {
    const result = validateFoodImageHeuristic(sampleImage, 'bread');
    assert.equal(result.approved, true);
    assert.equal(result.reason, 'heuristic-pass');
  });
});
