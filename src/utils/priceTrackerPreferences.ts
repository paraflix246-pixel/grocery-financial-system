import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveCanonicalName } from '@/src/services/itemNormalizationService';
import { normalizeTrackedItemKey as normalizeKey } from '@/src/services/priceTrackerLogic';

const HIDDEN_TRACKED_ITEMS_KEY = '@smartcart_hidden_tracked_items';

function normalizeTrackedItemKey(itemName: string): string {
  return normalizeKey(itemName, resolveCanonicalName);
}

async function readHiddenKeys(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(HIDDEN_TRACKED_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  } catch {
    return [];
  }
}

async function writeHiddenKeys(keys: string[]): Promise<void> {
  const unique = [...new Set(keys.map((key) => key.trim().toLowerCase()).filter(Boolean))];
  await AsyncStorage.setItem(HIDDEN_TRACKED_ITEMS_KEY, JSON.stringify(unique));
}

export async function getHiddenTrackedItemKeys(): Promise<Set<string>> {
  const keys = await readHiddenKeys();
  return new Set(keys);
}

export async function hideTrackedItem(itemName: string): Promise<void> {
  const key = normalizeTrackedItemKey(itemName);
  if (!key) return;
  const keys = await readHiddenKeys();
  if (keys.includes(key)) return;
  await writeHiddenKeys([...keys, key]);
}

export async function unhideTrackedItem(itemName: string): Promise<void> {
  const key = normalizeTrackedItemKey(itemName);
  if (!key) return;
  const keys = await readHiddenKeys();
  await writeHiddenKeys(keys.filter((entry) => entry !== key));
}
