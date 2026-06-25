import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { inferPantryCategory, isVaguePantryLineName } from '@/src/utils/pantryCategory';

describe('inferPantryCategory', () => {
  it('maps receipt-style meat and specific produce lines', () => {
    assert.equal(inferPantryCategory('RIBEYE STEAK PK'), 'Meat');
    assert.equal(inferPantryCategory('SALMON FILLET'), 'Meat');
    assert.equal(inferPantryCategory('CHICKEN WINDS'), 'Meat');
    assert.equal(inferPantryCategory('TOMATOES ON VINE'), 'Produce');
  });

  it('sends vague receipt buckets and pet food to Other', () => {
    assert.equal(inferPantryCategory('PRODUCE'), 'Other');
    assert.equal(inferPantryCategory('SNACKS'), 'Other');
    assert.equal(inferPantryCategory('FROZEN FOOD'), 'Other');
    assert.equal(inferPantryCategory('CAT FOOD'), 'Other');
    assert.equal(inferPantryCategory('DOG FOOD'), 'Other');
    assert.ok(isVaguePantryLineName('PRODUCE'));
  });

  it('maps confident dairy, snacks, and household lines', () => {
    assert.equal(inferPantryCategory('MILK 2 GAL'), 'Dairy');
    assert.equal(inferPantryCategory('EGGS 18CT'), 'Dairy');
    assert.equal(inferPantryCategory('CHIPITS HERSHEY'), 'Snacks');
    assert.equal(inferPantryCategory('DIAPERS'), 'Household');
    assert.equal(inferPantryCategory('Frozen Fries'), 'Frozen');
  });

  it('defaults unknown lines to Other', () => {
    assert.equal(inferPantryCategory('MISC ITEM 123'), 'Other');
  });
});
