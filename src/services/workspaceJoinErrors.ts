export type WorkspaceJoinErrorCode =
  | 'INVALID_CODE'
  | 'NOT_SIGNED_IN'
  | 'NOT_FOUND'
  | 'ALREADY_OWNER'
  | 'GENERIC';

export class WorkspaceJoinError extends Error {
  readonly code: WorkspaceJoinErrorCode;

  constructor(code: WorkspaceJoinErrorCode, message: string) {
    super(message);
    this.name = 'WorkspaceJoinError';
    this.code = code;
  }
}

export type JoinWorkspaceOutcome = {
  workspace: import('@/src/models/workspace').Workspace;
  alreadyMember: boolean;
  subscriptionActive: boolean;
};
