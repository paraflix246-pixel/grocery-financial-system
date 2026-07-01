import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_ROLE_KEY = '@pennypantry_dev_family_role_override';

export type DevFamilyRoleOverride = 'owner' | 'member';

let cachedOverride: DevFamilyRoleOverride | null | undefined;

export async function getDevFamilyRoleOverride(): Promise<DevFamilyRoleOverride | null> {
  if (!__DEV__) return null;
  if (cachedOverride !== undefined) return cachedOverride;
  try {
    const raw = await AsyncStorage.getItem(DEV_ROLE_KEY);
    if (raw === 'owner' || raw === 'member') {
      cachedOverride = raw;
      return raw;
    }
  } catch {
    // ignore
  }
  cachedOverride = null;
  return null;
}

export function getDevFamilyRoleOverrideSync(): DevFamilyRoleOverride | null {
  if (!__DEV__) return null;
  return cachedOverride ?? null;
}

export async function setDevFamilyRoleOverride(
  role: DevFamilyRoleOverride | null
): Promise<void> {
  if (!__DEV__) return;
  cachedOverride = role;
  if (role) {
    await AsyncStorage.setItem(DEV_ROLE_KEY, role);
  } else {
    await AsyncStorage.removeItem(DEV_ROLE_KEY);
  }
}

export function clearDevFamilyRoleOverrideCache(): void {
  cachedOverride = undefined;
}
