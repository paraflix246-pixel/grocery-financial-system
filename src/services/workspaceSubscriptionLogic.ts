import type { WorkspaceSubscriptionStatus } from '@/src/models/workspace';

const ACTIVE_STATUSES = new Set<WorkspaceSubscriptionStatus>(['active', 'trialing', 'past_due']);

export function isWorkspaceSubscriptionActive(
  status: WorkspaceSubscriptionStatus | string | null | undefined
): boolean {
  return Boolean(status && ACTIVE_STATUSES.has(status as WorkspaceSubscriptionStatus));
}
