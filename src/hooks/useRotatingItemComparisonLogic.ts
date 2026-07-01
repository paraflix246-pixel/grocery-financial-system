import type { ListItem } from '@/src/models/types';

/** Stable content key for rotating comparison loads (ignores array identity). */
export function buildComparisonListSignature(listItems: ListItem[]): string {
  return listItems
    .map((item) => `${item.id}:${item.name}:${item.quantity}:${item.storePreference ?? ''}`)
    .join('|');
}
