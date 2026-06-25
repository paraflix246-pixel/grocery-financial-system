import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_LIST_KEY = '@smartcart_last_opened_list_id';
const LAST_SCROLL_KEY = (listId: string) => `@smartcart_list_scroll_${listId}`;
const BUY_AGAIN_HIDDEN_KEY = (listId: string) => `@smartcart_buy_again_hidden_${listId}`;
const OPEN_LAST_LIST_KEY = '@smartcart_open_last_list';

/** Set before leaving a list so the Lists tab does not immediately re-open it. */
let skipOpenLastListOnce = false;

export function skipOpenLastListOnNextFocus(): void {
  skipOpenLastListOnce = true;
}

export function consumeSkipOpenLastList(): boolean {
  if (!skipOpenLastListOnce) return false;
  skipOpenLastListOnce = false;
  return true;
}

export async function saveLastOpenedListId(listId: string): Promise<void> {
  await AsyncStorage.setItem(LAST_LIST_KEY, listId);
}

export async function getLastOpenedListId(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_LIST_KEY);
}

export async function saveListScrollOffset(listId: string, offset: number): Promise<void> {
  await AsyncStorage.setItem(LAST_SCROLL_KEY(listId), String(Math.round(offset)));
}

export async function getListScrollOffset(listId: string): Promise<number> {
  const raw = await AsyncStorage.getItem(LAST_SCROLL_KEY(listId));
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export async function getOpenLastListPreference(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(OPEN_LAST_LIST_KEY);
  return raw !== 'false';
}

export async function setOpenLastListPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(OPEN_LAST_LIST_KEY, enabled ? 'true' : 'false');
}

export async function getBuyAgainHidden(listId: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(BUY_AGAIN_HIDDEN_KEY(listId));
  return raw === 'true';
}

export async function setBuyAgainHidden(listId: string, hidden: boolean): Promise<void> {
  await AsyncStorage.setItem(BUY_AGAIN_HIDDEN_KEY(listId), hidden ? 'true' : 'false');
}
