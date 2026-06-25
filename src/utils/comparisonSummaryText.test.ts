import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildComparisonNarrative,
  formatPlannedTotalLabel,
  formatVarianceLabel,
  getOverspendDrivers,
  getTopVarianceDriver,
  groupComparisonItems,
  listHasUnpricedItems,
} from './comparisonSummaryText';

describe('comparisonSummaryText', () => {
  it('groups items by match type', () => {
    const grouped = groupComparisonItems([
      { name: 'Broom', matchType: 'missing', plannedPrice: 0, actualPrice: 0, variance: 0 },
      { name: 'Eggs', matchType: 'extra', plannedPrice: 0, actualPrice: 3.49, variance: 3.49 },
      { name: 'Milk', matchType: 'matched', plannedPrice: 2.5, actualPrice: 2.5, variance: 0 },
    ]);

    assert.equal(grouped.missing.length, 1);
    assert.equal(grouped.extra.length, 1);
    assert.equal(grouped.matched.length, 1);
  });

  it('detects unpriced list items', () => {
    assert.equal(
      listHasUnpricedItems([
        { name: 'Broom', matchType: 'missing', plannedPrice: 0, actualPrice: 0 },
      ]),
      true
    );
    assert.equal(
      listHasUnpricedItems([
        { name: 'Milk', matchType: 'matched', plannedPrice: 2.5, actualPrice: 2.5 },
      ]),
      false
    );
  });

  it('shows not estimated when list has no prices', () => {
    assert.equal(
      formatPlannedTotalLabel(0, [
        { name: 'Broom', matchType: 'missing', plannedPrice: 0, actualPrice: 0 },
      ]),
      'Not estimated'
    );
    assert.equal(formatPlannedTotalLabel(12.5), '$12.50');
  });

  it('builds plain-language narrative for unpriced list with extras', () => {
    const narrative = buildComparisonNarrative({
      plannedTotal: 0,
      actualTotal: 10.77,
      variance: 10.77,
      items: [
        { name: 'Broom', matchType: 'missing', plannedPrice: 0, actualPrice: 0, variance: 0 },
        { name: 'Eggs', matchType: 'extra', plannedPrice: 0, actualPrice: 3.49, variance: 3.49 },
        { name: 'Bread', matchType: 'extra', plannedPrice: 0, actualPrice: 2.99, variance: 2.99 },
        {
          name: 'Orange Juice',
          matchType: 'extra',
          plannedPrice: 0,
          actualPrice: 4.29,
          variance: 4.29,
        },
      ],
    });

    assert.match(narrative, /3 items that weren't on your list for \$10\.77/);
    assert.match(narrative, /Broom was on your list but not purchased/);
    assert.match(narrative, /no prices/);
  });

  it('hides variance label when planned total is zero', () => {
    assert.equal(formatVarianceLabel(10.77, 0), null);
    assert.deepEqual(formatVarianceLabel(2.5, 20), {
      label: 'Spent over plan',
      value: '$2.50',
    });
    assert.deepEqual(formatVarianceLabel(-1.25, 20), {
      label: 'Spent under plan',
      value: '$1.25',
    });
  });

  it('lists overspend drivers and top variance line', () => {
    const items = [
      { name: 'CHICKEN DRUMSTICKS', matchType: 'matched' as const, variance: 7.82 },
      { name: 'MILK', matchType: 'matched' as const, variance: -1 },
      { name: 'CANDY BAR', matchType: 'extra' as const, actualPrice: 2.5, variance: 2.5 },
    ];

    const drivers = getOverspendDrivers(items);
    assert.equal(drivers.length, 2);
    assert.equal(drivers[0].name, 'CHICKEN DRUMSTICKS');
    assert.equal(getTopVarianceDriver({ items }), 'CHICKEN DRUMSTICKS +$7.82');
  });
});
