import { GROCERY_CATALOG } from '@/src/data/groceryCatalog';
import Fuse from 'fuse.js';

const fuse = new Fuse(GROCERY_CATALOG, {
  keys: ['name', 'canonicalName', 'aliases'],
  threshold: 0.35,
  includeScore: true,
});

/** Map OCR-shortened names to catalog canonical names when confidence is high. */
export function canonicalizeItemName(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed || trimmed === '(name hidden)') return trimmed;

  const results = fuse.search(trimmed, { limit: 1 });
  if (results.length === 0 || (results[0].score ?? 1) > 0.35) {
    return trimmed;
  }

  return results[0].item.canonicalName ?? results[0].item.name;
}

export function canonicalizeDraftItems<T extends { name: string; price: number; quantity: number }>(
  items: T[]
): T[] {
  return items.map((item) => ({
    ...item,
    name: canonicalizeItemName(item.name),
  }));
}
