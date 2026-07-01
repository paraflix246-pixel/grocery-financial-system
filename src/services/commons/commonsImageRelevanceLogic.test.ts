import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMMONS_RELEVANCE_SCORE_THRESHOLD,
  isRejectedCommonsTitle,
  meetsCommonsRelevanceThreshold,
  scoreCommonsImageTitle,
} from '@/src/services/commons/commonsImageRelevanceLogic';

describe('scoreCommonsImageTitle', () => {
  it('scores loaf of bread highly for bread', () => {
    const score = scoreCommonsImageTitle('File:Loaf of bread.jpg', 'bread');
    assert.ok(score >= COMMONS_RELEVANCE_SCORE_THRESHOLD);
  });

  it('rejects croissant titles for bread', () => {
    assert.equal(isRejectedCommonsTitle('File:Croissant on plate.jpg', 'bread'), true);
    assert.equal(scoreCommonsImageTitle('File:Croissant on plate.jpg', 'bread'), -1);
  });

  it('rejects pastry and bagel titles for bread', () => {
    assert.equal(isRejectedCommonsTitle('File:Fresh bagel.jpg', 'bread'), true);
    assert.equal(isRejectedCommonsTitle('File:Danish pastry.jpg', 'bread'), true);
  });

  it('prefers milk depictions over unrelated results', () => {
    const milkScore = scoreCommonsImageTitle('File:Glass of milk.jpg', 'milk');
    const logoScore = scoreCommonsImageTitle('File:Milk company logo.svg', 'milk');
    assert.ok(milkScore > logoScore);
    assert.equal(isRejectedCommonsTitle('File:Milk company logo.svg', 'milk'), true);
  });
});

describe('meetsCommonsRelevanceThreshold', () => {
  it('requires a minimum score before caching search results', () => {
    assert.equal(meetsCommonsRelevanceThreshold(39), false);
    assert.equal(meetsCommonsRelevanceThreshold(40), true);
  });
});
