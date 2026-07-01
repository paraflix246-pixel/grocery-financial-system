import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_FREE_CART_KEY = '@pennypantry_dev_free_cart_preview';

let cachedActive: boolean | undefined;

export function isDevForceFreeCartPreviewActiveSync(): boolean {
  if (!__DEV__) return false;
  return cachedActive ?? false;
}

export async function isDevForceFreeCartPreviewActive(): Promise<boolean> {
  if (!__DEV__) return false;
  if (cachedActive !== undefined) return cachedActive;
  try {
    const raw = await AsyncStorage.getItem(DEV_FREE_CART_KEY);
    cachedActive = raw === 'true';
    return cachedActive;
  } catch {
    cachedActive = false;
    return false;
  }
}

export async function setDevForceFreeCartPreview(active: boolean): Promise<void> {
  if (!__DEV__) return;
  cachedActive = active;
  if (active) {
    await AsyncStorage.setItem(DEV_FREE_CART_KEY, 'true');
  } else {
    await AsyncStorage.removeItem(DEV_FREE_CART_KEY);
  }
}

export function clearDevForceFreeCartPreviewCache(): void {
  cachedActive = undefined;
}
