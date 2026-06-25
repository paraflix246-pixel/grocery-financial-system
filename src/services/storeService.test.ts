import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { StoreDefinition } from '@/src/data/stores';
import type { StorePreference } from '@/src/models/types';
import {
  applyStorePreferences,
  sortStoresForDisplay,
} from '@/src/utils/storeListUtils';

const walmart: StoreDefinition = {
  id: 'walmart',
  name: 'Walmart',
  brandColor: '#0071CE',
  logoUrl: '',
  initials: 'W',
};

const aldi: StoreDefinition = {
  id: 'aldi',
  name: 'Aldi',
  brandColor: '#F57900',
  logoUrl: '',
  initials: 'A',
};

const target: StoreDefinition = {
  id: 'target',
  name: 'Target',
  brandColor: '#CC0000',
  logoUrl: '',
  initials: 'T',
};

describe('sortStoresForDisplay', () => {
  it('sorts favorites first, then alphabetically', () => {
    const sorted = sortStoresForDisplay([
      { ...walmart, isFavorite: false },
      { ...target, isFavorite: true },
      { ...aldi, isFavorite: false },
    ]);
    assert.deepEqual(
      sorted.map((store) => store.id),
      ['target', 'aldi', 'walmart']
    );
  });
});

describe('applyStorePreferences', () => {
  it('merges favorite and region preferences onto store definitions', () => {
    const preferences: StorePreference[] = [
      {
        storeId: 'walmart',
        isFavorite: true,
        isHidden: false,
        region: 'TX',
        updatedAt: '2026-06-20T00:00:00.000Z',
      },
    ];
    const [store] = applyStorePreferences([walmart], preferences);
    assert.equal(store.isFavorite, true);
    assert.equal(store.region, 'TX');
  });
});
