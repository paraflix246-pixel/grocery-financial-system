const KROGER_FAMILY_MARKERS = [
  'kroger',
  'ralphs',
  'fred meyer',
  'king soopers',
  'smiths',
  'frys',
  'fry\'s',
  'qfc',
  'mariano',
  'pick n save',
  'food 4 less',
  'foods co',
  'city market',
  'dillons',
  'gerbes',
  'jay c',
  'bakers',
  'metro market',
  'pay-less',
  'ruler',
];

export function resolveApiStoreName(apiStoreName: string, catalogStores: string[]): string {
  const trimmed = apiStoreName.trim();
  if (!trimmed) return trimmed;

  const lower = trimmed.toLowerCase();
  const exact = catalogStores.find((store) => store.toLowerCase() === lower);
  if (exact) return exact;

  const krogerStore = catalogStores.find((store) => store.toLowerCase() === 'kroger');
  if (krogerStore && KROGER_FAMILY_MARKERS.some((marker) => lower.includes(marker))) {
    return krogerStore;
  }

  for (const store of catalogStores) {
    const storeLower = store.toLowerCase();
    if (lower.includes(storeLower) || storeLower.includes(lower)) {
      return store;
    }
  }

  return trimmed;
}
