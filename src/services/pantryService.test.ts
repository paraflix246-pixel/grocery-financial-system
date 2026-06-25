import assert from 'node:assert/strict';

import { describe, it } from 'node:test';



import type { PantryItem } from '@/src/models/types';

import {

  computePantryStatus,

  DEFAULT_LOW_STOCK_THRESHOLD,

  EXPIRING_SOON_WINDOW_DAYS,

  formatExpiryStatusLabel,

  computeExpiresOnDate,

  computeShelfLifeDaysFromExpires,

  getDaysUntilExpiry,

  getLowStockThreshold,

  getShelfLifeDays,

  inferDefaultShelfLifeDays,

  isExpiringSoon,

  isRunningLowByQuantity,

  MAX_LOW_STOCK_THRESHOLD,

  parseLowStockThresholdInput,

} from '@/src/utils/pantryStatus';

import { addDaysToISO, daysBetweenISO, resolvePantryAddedDateFromReceipt, todayISO } from '@/src/utils/dateParser';



function makeItem(overrides: Partial<PantryItem> = {}): PantryItem {

  const now = new Date().toISOString();

  return {

    id: 'pantry-1',

    name: 'Rice',

    quantity: 5,

    category: 'Pantry',

    addedDate: todayISO(),

    source: 'manual',

    createdAt: now,

    updatedAt: now,

    ...overrides,

  };

}



function daysAgoISO(days: number): string {

  const date = new Date(`${todayISO()}T12:00:00`);

  date.setDate(date.getDate() - days);

  return date.toISOString().slice(0, 10);

}



describe('pantry running low by quantity', () => {

  it('uses default threshold of 3', () => {

    assert.equal(getLowStockThreshold(makeItem()), DEFAULT_LOW_STOCK_THRESHOLD);

  });



  it('marks item running low when quantity is at threshold', () => {

    const item = makeItem({ quantity: 3, lowStockThreshold: 3 });

    assert.equal(isRunningLowByQuantity(item), true);

    assert.equal(computePantryStatus(item).status, 'running_low');

  });



  it('marks item running low when quantity is below threshold', () => {

    const item = makeItem({ quantity: 2, lowStockThreshold: 3 });

    assert.equal(isRunningLowByQuantity(item), true);

    assert.equal(computePantryStatus(item).status, 'running_low');

    assert.match(computePantryStatus(item).statusLabel, /2 left/);

  });



  it('keeps item in stock above threshold', () => {

    const item = makeItem({ quantity: 4, lowStockThreshold: 3 });

    assert.equal(isRunningLowByQuantity(item), false);

    assert.equal(computePantryStatus(item).status, 'in_stock');

  });



  it('respects custom low-stock threshold', () => {

    const item = makeItem({ quantity: 5, lowStockThreshold: 5 });

    assert.equal(isRunningLowByQuantity(item), true);

  });



  it('prioritizes expiring soon over running low', () => {

    const item = makeItem({

      name: 'Milk',

      category: 'Dairy',

      quantity: 1,

      lowStockThreshold: 3,

      shelfLifeDays: 7,

      addedDate: daysAgoISO(10),

    });

    assert.equal(computePantryStatus(item).status, 'expiring_soon');

  });

});



describe('pantry expiring soon by shelf life', () => {

  it('infers default shelf life for dairy', () => {

    assert.equal(inferDefaultShelfLifeDays({ name: 'Milk', category: 'Dairy' }), 7);

    assert.equal(inferDefaultShelfLifeDays({ name: 'Rice', category: 'Pantry' }), null);

  });



  it('uses explicit shelf life days', () => {

    const item = makeItem({ name: 'Milk', category: 'Dairy', shelfLifeDays: 14, addedDate: daysAgoISO(12) });

    assert.equal(getShelfLifeDays(item), 14);

    assert.equal(getDaysUntilExpiry(item), 2);

    assert.equal(isExpiringSoon(item), true);

  });



  it('marks item expiring soon within window', () => {

    const item = makeItem({

      name: 'Bananas',

      category: 'Produce',

      shelfLifeDays: 5,

      addedDate: daysAgoISO(3),

    });

    assert.equal(getDaysUntilExpiry(item), 2);

    assert.equal(computePantryStatus(item).status, 'expiring_soon');

    assert.equal(computePantryStatus(item).statusLabel, formatExpiryStatusLabel(2));

  });



  it('keeps item in stock when expiry is beyond window', () => {

    const item = makeItem({

      name: 'Bananas',

      category: 'Produce',

      shelfLifeDays: 7,

      addedDate: daysAgoISO(1),

    });

    assert.equal(getDaysUntilExpiry(item), 6);

    assert.equal(isExpiringSoon(item), false);

    assert.equal(computePantryStatus(item).status, 'in_stock');

  });



  it('treats shelf life of 0 as no expiry', () => {

    const item = makeItem({

      name: 'Milk',

      category: 'Dairy',

      shelfLifeDays: 0,

      addedDate: daysAgoISO(30),

    });

    assert.equal(getShelfLifeDays(item), null);

    assert.equal(computePantryStatus(item).status, 'in_stock');

  });



  it('uses expiring soon window of 3 days', () => {

    assert.equal(EXPIRING_SOON_WINDOW_DAYS, 3);

  });

});



describe('pantry custom low-stock threshold input', () => {

  it('parses valid custom thresholds', () => {

    assert.equal(parseLowStockThresholdInput('10'), 10);

    assert.equal(parseLowStockThresholdInput('999'), MAX_LOW_STOCK_THRESHOLD);

  });



  it('rejects invalid thresholds', () => {

    assert.equal(parseLowStockThresholdInput(''), null);

    assert.equal(parseLowStockThresholdInput('0'), null);

    assert.equal(parseLowStockThresholdInput('1000'), null);

    assert.equal(parseLowStockThresholdInput('abc'), null);

  });



  it('marks item running low with custom threshold', () => {

    const item = makeItem({ quantity: 10, lowStockThreshold: 10 });

    assert.equal(isRunningLowByQuantity(item), true);

  });

});



describe('pantry date-based expiry helpers', () => {

  it('computes expires-on from added date and shelf life', () => {

    const added = todayISO();

    const expires = computeExpiresOnDate(added, 7);

    assert.ok(expires);

    assert.equal(daysBetweenISO(added, expires!), 7);

  });



  it('derives shelf life from added and expires-on dates', () => {

    const added = daysAgoISO(3);

    const expires = addDaysToISO(added, 10);

    assert.equal(computeShelfLifeDaysFromExpires(added, expires), 10);

  });



  it('uses derived shelf life for expiring soon status', () => {

    const added = daysAgoISO(8);

    const expires = addDaysToISO(added, 10);

    const shelfLifeDays = computeShelfLifeDaysFromExpires(added, expires)!;

    const item = makeItem({

      name: 'Milk',

      category: 'Dairy',

      shelfLifeDays,

      addedDate: added,

    });

    assert.equal(getDaysUntilExpiry(item), 2);

    assert.equal(computePantryStatus(item).status, 'expiring_soon');

  });

});



describe('pantry added date rules', () => {

  it('uses receipt transaction date when available', () => {

    const added = resolvePantryAddedDateFromReceipt({

      date: '2026-06-14',

      createdAt: '2026-06-21T15:30:00.000Z',

    });

    assert.equal(added, '2026-06-14');

  });



  it('falls back to scan date when receipt has no transaction date', () => {

    const added = resolvePantryAddedDateFromReceipt({

      date: '',

      createdAt: '2026-06-21T15:30:00.000Z',

    });

    assert.equal(added, '2026-06-21');

  });



  it('falls back to today when receipt has no date and no scan timestamp', () => {

    const added = resolvePantryAddedDateFromReceipt({ date: '' });

    assert.equal(added, todayISO());

  });



  it('prefers parsed transaction date over scan date for older receipts scanned later', () => {

    const added = resolvePantryAddedDateFromReceipt({

      date: '06/07/2026',

      createdAt: '2026-06-20T10:00:00.000Z',

    });

    assert.equal(added, '2026-06-07');

  });

});


