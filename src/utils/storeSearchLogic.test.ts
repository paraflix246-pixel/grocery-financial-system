import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { StoreDefinition } from '@/src/data/stores';
import type { Receipt } from '@/src/models/types';
import {
  buildRecentStoreEntries,
  searchStoreSuggestions,
  storeSearchSelectionToDraft,
} from '@/src/utils/storeSearchLogic';

const walmart: StoreDefinition = {
  id: 'walmart',
  name: 'Walmart',
  brandColor: '#0071CE',
  logoUrl: '',
  initials: 'W',
  region: 'TX',
};

const target: StoreDefinition = {
  id: 'target',
  name: 'Target',
  brandColor: '#CC0000',
  logoUrl: '',
  initials: 'T',
  isFavorite: true,
};

function receipt(partial: Partial<Receipt> & Pick<Receipt, 'storeName' | 'date'>): Receipt {
  return {
    id: partial.id ?? 'r1',
    storeName: partial.storeName,
    date: partial.date,
    total: partial.total ?? 10,
    imageUri: '',
    userCorrected: false,
    createdAt: partial.createdAt ?? '2026-06-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2026-06-01T00:00:00.000Z',
    storeAddress: partial.storeAddress,
    storeCity: partial.storeCity,
    storeRegion: partial.storeRegion,
    storePostalCode: partial.storePostalCode,
    storeCountry: partial.storeCountry,
  };
}

describe('buildRecentStoreEntries', () => {
  it('keeps the most recent location for a store', () => {
    const entries = buildRecentStoreEntries([
      receipt({
        id: 'r1',
        storeName: 'Walmart',
        date: '2026-05-01',
        storeCity: 'Austin',
        storeRegion: 'TX',
      }),
      receipt({
        id: 'r2',
        storeName: 'Walmart',
        date: '2026-06-01',
        storeCity: 'Dallas',
        storeRegion: 'TX',
        storePostalCode: '75201',
      }),
    ]);

    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.name, 'Walmart');
    assert.equal(entries[0]?.receiptCount, 2);
    assert.equal(entries[0]?.location.storeCity, 'Dallas');
    assert.equal(entries[0]?.location.storePostalCode, '75201');
  });
});

describe('searchStoreSuggestions', () => {
  it('returns recent stores when query is empty', () => {
    const recent = buildRecentStoreEntries([
      receipt({ storeName: 'HEB', date: '2026-06-01', storeRegion: 'TX' }),
    ]);
    const results = searchStoreSuggestions({
      query: '',
      stores: [walmart, target],
      recentStores: recent,
    });

    assert.ok(results.some((result) => result.name === 'HEB' && result.source === 'recent'));
    assert.ok(results.some((result) => result.name === 'Target'));
  });

  it('matches catalog stores by partial name', () => {
    const results = searchStoreSuggestions({
      query: 'wal',
      stores: [walmart, target],
      recentStores: [],
    });

    assert.deepEqual(
      results.map((result) => result.name),
      ['Walmart']
    );
  });
});

describe('storeSearchSelectionToDraft', () => {
  it('maps store region and location fields', () => {
    const draft = storeSearchSelectionToDraft({
      name: 'Walmart',
      region: 'tx',
      location: {
        storeCity: 'Austin',
        storeRegion: 'TX',
        storePostalCode: '78701',
        storeCountry: 'US',
      },
    });

    assert.equal(draft.storeName, 'Walmart');
    assert.equal(draft.storeCity, 'Austin');
    assert.equal(draft.storeRegion, 'TX');
    assert.equal(draft.storePostalCode, '78701');
    assert.equal(draft.storeCountry, 'US');
  });
});
