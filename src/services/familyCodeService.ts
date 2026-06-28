import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

import {
  buildFamilyInvitePath,
  generateFamilyCode,
  normalizeFamilyCode,
  parseFamilyInviteInput,
  type FamilyInviteParseResult,
} from '@/src/services/familyCodeLogic';
import { getAppUrl } from '@/src/utils/appOrigin';
import { generateId } from '@/src/utils/id';

export const FAMILY_CODE_KEY = '@smartcart_family_code';
export const FAMILY_GROUP_ID_KEY = '@smartcart_family_group_id';
export const FAMILY_MEMBER_ID_KEY = '@smartcart_family_member_id';

export {
  generateFamilyCode,
  normalizeFamilyCode,
  parseFamilyInviteInput,
  type FamilyInviteParseResult,
};

export async function getOrCreateFamilyCode(): Promise<string> {
  const stored = await AsyncStorage.getItem(FAMILY_CODE_KEY);
  if (stored) {
    const normalized = normalizeFamilyCode(stored);
    if (normalized) {
      if (normalized !== stored) {
        await AsyncStorage.setItem(FAMILY_CODE_KEY, normalized);
      }
      return normalized;
    }
  }
  const code = generateFamilyCode();
  await AsyncStorage.setItem(FAMILY_CODE_KEY, code);
  return code;
}

export async function getOrCreateMemberId(): Promise<string> {
  const stored = await AsyncStorage.getItem(FAMILY_MEMBER_ID_KEY);
  if (stored) return stored;
  const id = generateId();
  await AsyncStorage.setItem(FAMILY_MEMBER_ID_KEY, id);
  return id;
}

export async function getFamilyGroupId(): Promise<string | null> {
  return AsyncStorage.getItem(FAMILY_GROUP_ID_KEY);
}

export async function setFamilyGroupId(groupId: string): Promise<void> {
  await AsyncStorage.setItem(FAMILY_GROUP_ID_KEY, groupId);
}

export function buildFamilyInviteUrl(code: string): string {
  return getInviteUrl(code);
}

/** Public invite link — prefers EXPO_PUBLIC_APP_URL so phones never get localhost. */
export function getInviteUrl(code: string): string {
  const path = buildFamilyInvitePath(code);
  const appUrl = getAppUrl(path);
  if (appUrl && !appUrl.startsWith('exp://')) {
    return appUrl;
  }
  return Linking.createURL('/list/join', {
    queryParams: { code: normalizeFamilyCode(code) ?? code },
  });
}
