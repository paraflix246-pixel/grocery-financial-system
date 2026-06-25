import AsyncStorage from '@react-native-async-storage/async-storage';

export function listCheckedKey(listId: string): string {
  return `list_checked_${listId}`;
}

export async function loadCheckedIds(listId: string): Promise<Set<string>> {
  const stored = await AsyncStorage.getItem(listCheckedKey(listId));
  if (!stored) return new Set();
  return new Set(JSON.parse(stored) as string[]);
}

export async function saveCheckedIds(listId: string, checkedIds: Set<string>): Promise<void> {
  await AsyncStorage.setItem(listCheckedKey(listId), JSON.stringify([...checkedIds]));
}
