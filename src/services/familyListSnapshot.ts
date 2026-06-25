export type FamilyListSnapshot = {
  version?: number;
  listName?: string;
  familyCode?: string;
  exportedAt?: string;
  items: Array<{
    name: string;
    quantity?: number;
    expectedPrice?: number;
    category?: string;
  }>;
};

export function parseFamilyListSnapshot(json: string): FamilyListSnapshot {
  const parsed = JSON.parse(json) as FamilyListSnapshot;
  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error('JSON must include an items array');
  }
  return parsed;
}
