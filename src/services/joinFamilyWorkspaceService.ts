import { parseFamilyInviteInput } from '@/src/services/familyCodeLogic';
import {
  joinFamilyGroupByCode,
  isFamilySyncAvailable,
  startFamilyRealtimeSync,
} from '@/src/services/familySyncService';
import {
  mapWorkspaceJoinError,
  type JoinFamilyWorkspaceResult,
} from '@/src/services/joinFamilyWorkspaceLogic';

export async function joinFamilyWorkspaceFromInput(rawInput: string): Promise<JoinFamilyWorkspaceResult> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  const parsed = parseFamilyInviteInput(trimmed);
  if (!parsed || parsed.type !== 'code') {
    return { ok: false, code: 'INVALID_INPUT' };
  }

  try {
    const data = await joinFamilyGroupByCode(parsed.code);
    if (isFamilySyncAvailable() && data.subscriptionActive) {
      await startFamilyRealtimeSync();
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, code: mapWorkspaceJoinError(error) };
  }
}
