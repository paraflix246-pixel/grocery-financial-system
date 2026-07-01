import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CURATED_FOOD_IMAGES,
  lookupCuratedFoodImage,
  resolveCuratedItemKey,
} from '@/src/services/commons/curatedFoodImages';

describe('lookupCuratedFoodImage', () => {
  it('returns pinned loaf of bread for bread', () => {
    const image = lookupCuratedFoodImage('Bread');
    assert.equal(image?.itemKey, 'bread');
    assert.equal(image?.fileTitle, 'Loaf of bread.jpg');
  });

  it('resolves aliases to curated staples', () => {
    assert.equal(resolveCuratedItemKey('Whole Milk'), 'milk');
    assert.equal(lookupCuratedFoodImage('paper towel')?.itemKey, 'paper towels');
    assert.equal(lookupCuratedFoodImage('hamburger meat')?.fileTitle, 'Minced meat.jpg');
  });

  it('covers all cart-comparison starter staples except emoji-only items', () => {
    const expectedKeys = [
      'bread',
      'milk',
      'eggs',
      'bananas',
      'rice',
      'water',
      'ground beef',
      'butter',
      'coffee',
      'paper towels',
      'cheddar cheese',
    ];

    for (const key of expectedKeys) {
      assert.ok(
        CURATED_FOOD_IMAGES.some((entry) => entry.itemKey === key),
        `missing curated entry for ${key}`
      );
    }
  });

  it('returns null for non-curated items', () => {
    assert.equal(lookupCuratedFoodImage('dragon fruit'), null);
  });

  it('does not pin chicken breast (emoji-only instead)', () => {
    assert.equal(lookupCuratedFoodImage('chicken breast'), null);
  });
});
