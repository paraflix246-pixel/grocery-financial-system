import { WorkspaceJoinError } from '@/src/services/workspaceJoinErrors';

export type JoinFamilyWorkspaceSuccess = {
  groupId: string;
  code: string;
  workspaceName: string;
  alreadyMember: boolean;
  subscriptionActive: boolean;
};

export type JoinFamilyWorkspaceErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_CODE'
  | 'NOT_SIGNED_IN'
  | 'NOT_FOUND'
  | 'ALREADY_OWNER'
  | 'GENERIC';

export type JoinFamilyWorkspaceResult =
  | { ok: true; data: JoinFamilyWorkspaceSuccess }
  | { ok: false; code: JoinFamilyWorkspaceErrorCode };

export function mapWorkspaceJoinError(error: unknown): JoinFamilyWorkspaceErrorCode {
  if (error instanceof WorkspaceJoinError) {
    if (error.code === 'INVALID_CODE') return 'INVALID_CODE';
    if (error.code === 'NOT_SIGNED_IN') return 'NOT_SIGNED_IN';
    if (error.code === 'NOT_FOUND') return 'NOT_FOUND';
    if (error.code === 'ALREADY_OWNER') return 'ALREADY_OWNER';
  }
  return 'GENERIC';
}

export function resolveJoinSuccessMessageKey(
  outcome: JoinFamilyWorkspaceSuccess
): 'familyJoin.success.joined' | 'familyJoin.success.alreadyMember' | 'familyJoin.success.joinedNoSub' {
  if (outcome.alreadyMember) return 'familyJoin.success.alreadyMember';
  if (!outcome.subscriptionActive) return 'familyJoin.success.joinedNoSub';
  return 'familyJoin.success.joined';
}
