import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { WorkspaceScopeSwitcher } from '@/src/components/WorkspaceScopeSwitcher';
import { canUseWorkspaceScope } from '@/src/services/dataScopeLogic';
import { useAdminStatus } from '@/src/hooks/useAdminStatus';
import { useWorkspaceStore } from '@/src/store/useWorkspaceStore';

/** Personal | Household switcher for tab screens — visible to Household subscribers. */
export function WorkspaceScopeBar() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAdmin } = useAdminStatus();
  const activeScope = useWorkspaceStore((s) => s.activeScope);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const isMember = useWorkspaceStore((s) => s.isCurrentMember);
  const hasActiveSub = useWorkspaceStore((s) => s.hasActiveWorkspaceSub);
  const setActiveScope = useWorkspaceStore((s) => s.setActiveScope);

  const hasWorkspace = canUseWorkspaceScope(isMember, hasActiveSub, isAdmin);

  if (!hasWorkspace) return null;

  return (
    <WorkspaceScopeSwitcher
      scope={activeScope}
      workspaceName={currentWorkspace?.name ?? t('workspace.defaultName')}
      hasWorkspace={hasWorkspace}
      onScopeChange={(scope) => void setActiveScope(scope)}
      onManageHousehold={() => router.push('/family_plans' as never)}
    />
  );
}
