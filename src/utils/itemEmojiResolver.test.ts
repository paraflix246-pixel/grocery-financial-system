import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CUSTOM_ITEM_EMOJI,
  DEFAULT_ITEM_EMOJI,
  getEmojiForUserDefinedItem,
  isPantryEligibleItem,
  isRetailSkuLine,
  resolveItemEmoji,
} from '@/src/utils/itemEmojiResolver';

describe('resolveItemEmoji', () => {
  it('returns catalog emoji for exact canonical match', () => {
    assert.equal(resolveItemEmoji('Milk'), '🥛');
    assert.equal(resolveItemEmoji('Bananas'), '🍌');
  });

  it('returns grocery cart for user-defined items', () => {
    assert.equal(resolveItemEmoji(undefined, 'Pumkin', { isUserDefined: true }), CUSTOM_ITEM_EMOJI);
    assert.equal(getEmojiForUserDefinedItem(), '🛒');
  });

  it('matches receipt-style names via catalog substring', () => {
    assert.equal(resolveItemEmoji(undefined, 'Great Value 2% Milk 1 Gal'), '🥛');
    assert.equal(resolveItemEmoji(undefined, 'Lactose Free Milk'), '🥛');
    assert.equal(resolveItemEmoji(undefined, 'Boneless Chicken Breast'), '🍗');
  });

  it('uses keyword rules for common grocery wording', () => {
    assert.equal(resolveItemEmoji(undefined, 'GV Lactose Free Whole Milk'), '🥛');
    assert.equal(resolveItemEmoji(undefined, 'Fresh Strawberries 1lb'), '🍓');
    assert.equal(resolveItemEmoji(undefined, 'Sparkling Water 12pk'), '💧');
    assert.equal(resolveItemEmoji(undefined, 'Ground Turkey 93% Lean'), '🦃');
  });

  it('falls back to food emoji instead of cart for unknown food-like items', () => {
    assert.equal(resolveItemEmoji(undefined, 'Store Brand Deli Ham'), '🍖');
    assert.equal(resolveItemEmoji(undefined, 'Random Grocery Item'), '🍽️');
  });

  it('uses household and retail emojis for non-food items', () => {
    assert.equal(resolveItemEmoji(undefined, 'Paper Towels 6 Roll'), '🧻');
    assert.equal(resolveItemEmoji(undefined, 'Laundry Detergent'), '🧺');
    assert.equal(resolveItemEmoji(undefined, '074020113 FLOOR LAMPS'), DEFAULT_ITEM_EMOJI);
    assert.equal(resolveItemEmoji(undefined, 'DIAPERS'), '👶');
    assert.equal(resolveItemEmoji(undefined, 'CAT FOOD'), '🐱');
    assert.equal(resolveItemEmoji(undefined, 'DOG FOOD'), '🐶');
    assert.equal(resolveItemEmoji(undefined, '(name hidden)'), '📋');
    assert.equal(resolveItemEmoji(undefined, '096056095 A New Day'), DEFAULT_ITEM_EMOJI);
    assert.equal(resolveItemEmoji(undefined, 'CLEANING ITEMS'), '🧴');
    assert.equal(resolveItemEmoji(undefined, 'Broom'), '🧹');
    assert.equal(resolveItemEmoji(undefined, 'Mop'), '🧹');
    assert.equal(resolveItemEmoji(undefined, 'Sponge'), '🧽');
  });

  it('falls back to cart emoji for completely unknown items', () => {
    assert.equal(resolveItemEmoji(undefined, ''), DEFAULT_ITEM_EMOJI);
    assert.equal(resolveItemEmoji(undefined, 'XYZ Unknown Product'), DEFAULT_ITEM_EMOJI);
    assert.equal(resolveItemEmoji(undefined, 'Random Household Thing'), DEFAULT_ITEM_EMOJI);
  });
});

describe('isPantryEligibleItem', () => {
  it('excludes retail SKU lines and OCR placeholders', () => {
    assert.equal(isPantryEligibleItem('(name hidden)'), false);
    assert.equal(isPantryEligibleItem('074020113 FLOOR LAMPS'), false);
    assert.equal(isPantryEligibleItem('096056095 A New Day'), false);
    assert.equal(isPantryEligibleItem('CLEANING ITEMS'), false);
  });

  it('includes grocery items from receipts', () => {
    assert.equal(isPantryEligibleItem('MILK 2 GAL'), true);
    assert.equal(isPantryEligibleItem('PORK CHOPS FAMILY PK'), true);
    assert.equal(isPantryEligibleItem('PRODUCE'), true);
    assert.equal(isPantryEligibleItem('SNACKS'), true);
    assert.equal(isPantryEligibleItem('SALMON FILLET'), true);
    assert.equal(isPantryEligibleItem('DIAPERS'), true);
    assert.equal(isPantryEligibleItem('CAT FOOD'), true);
  });
});

describe('isRetailSkuLine', () => {
  it('detects Target-style scan codes', () => {
    assert.equal(isRetailSkuLine('074020113 FLOOR LAMPS'), true);
    assert.equal(isRetailSkuLine('Bread'), false);
  });
});
