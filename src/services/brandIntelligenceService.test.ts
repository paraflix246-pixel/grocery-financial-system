import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getPopularBrandEntries,
  searchBrandIntelligence,
} from '@/src/services/brandIntelligenceService';

describe('searchBrandIntelligence', () => {
  it('matches brand name directly', () => {
    const result = searchBrandIntelligence('Oreo');
    assert.ok(result);
    assert.equal(result.entry.brand, 'Oreo');
    assert.equal(result.matchType, 'brand');
  });

  it('matches product alias', () => {
    const result = searchBrandIntelligence('tide pods');
    assert.ok(result);
    assert.equal(result.entry.brand, 'Tide');
    assert.equal(result.matchType, 'product');
  });

  it('matches related brand to parent entry', () => {
    const result = searchBrandIntelligence('Philadelphia');
    assert.ok(result);
    assert.equal(result.entry.brand, 'Kraft');
    assert.equal(result.matchType, 'related_brand');
  });

  it('bridges grocery catalog product to brand', () => {
    const result = searchBrandIntelligence('oreo cookies');
    assert.ok(result);
    assert.equal(result.entry.brand, 'Oreo');
  });

  it('returns sibling and alternative recommendations', () => {
    const result = searchBrandIntelligence('Great Value');
    assert.ok(result);
    assert.ok(result.siblingBrands.includes('Equate'));
    assert.ok(result.alternativeBrands.some((entry) => entry.brand === 'Kirkland Signature'));
  });

  it('returns null for unknown products', () => {
    assert.equal(searchBrandIntelligence('xyzunknownbrand123'), null);
  });

  it('returns empty for blank query', () => {
    assert.equal(searchBrandIntelligence('   '), null);
  });
});

describe('getPopularBrandEntries', () => {
  it('returns featured brands', () => {
    const brands = getPopularBrandEntries();
    assert.ok(brands.length >= 6);
    assert.ok(brands.some((entry) => entry.brand === 'Oreo'));
  });
});
