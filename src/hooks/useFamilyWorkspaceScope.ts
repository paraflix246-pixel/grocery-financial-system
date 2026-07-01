import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

/** True when the user is viewing shared Household / Family workspace data. */
export function useFamilyWorkspaceScope(): boolean {
  return useWorkspaceStore((s) => s.activeScope === 'workspace');
}
