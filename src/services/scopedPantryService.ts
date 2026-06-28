import type { DataScope } from '@/src/models/workspace';
import { isPersonalScope, isWorkspaceScope } from '@/src/services/dataScopeLogic';
import { loadPantryItems, type PantryItemView } from '@/src/services/pantryService';
import { listWorkspacePantryItems } from '@/src/services/workspacePantryService';

export async function loadPantryItemsForScope(
  scope: DataScope,
  workspaceId: string | null
): Promise<PantryItemView[]> {
  if (isWorkspaceScope(scope) && workspaceId) {
    return listWorkspacePantryItems(workspaceId);
  }
  if (isPersonalScope(scope)) {
    return loadPantryItems();
  }
  return [];
}
