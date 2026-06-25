import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_STARTER_ITEM_COUNT,
  pickStarterItemNames,
  STARTER_ITEM_POOL,
} from '@/src/data/starterCommonGoods';

const STARTER_NAMES_KEY = '@smartcart_starter_item_names';
const STARTERS_DISMISSED_KEY = '@smartcart_starters_dismissed';

export async function getStartersDismissed(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STARTERS_DISMISSED_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setStartersDismissed(dismissed: boolean): Promise<void> {
  try {
    if (dismissed) {
      await AsyncStorage.setItem(STARTERS_DISMISSED_KEY, '1');
    } else {
      await AsyncStorage.removeItem(STARTERS_DISMISSED_KEY);
    }
  } catch {
    // ignore persistence failures
  }
}

export async function getOrCreateStarterItemNames(
  count = DEFAULT_STARTER_ITEM_COUNT
): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STARTER_NAMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      ) {
        return parsed.slice(0, count);
      }
    }
  } catch {
    // fall through to create a new set
  }

  const names = pickStarterItemNames(
    STARTER_ITEM_POOL,
    count,
    `install-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await AsyncStorage.setItem(STARTER_NAMES_KEY, JSON.stringify(names));
  return names;
}
