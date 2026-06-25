export type PriceWatchTab = 'watchlist' | 'alerts';

export type PriceAlertsFormRequest =
  | { type: 'new'; itemName?: string }
  | { type: 'edit'; ruleId: string };

export function parsePriceWatchTab(tab: string | string[] | undefined): PriceWatchTab {
  const value = Array.isArray(tab) ? tab[0] : tab;
  return value === 'alerts' ? 'alerts' : 'watchlist';
}

export function parsePriceWatchAction(action: string | string[] | undefined): 'new' | null {
  const value = Array.isArray(action) ? action[0] : action;
  return value === 'new' ? 'new' : null;
}

export function buildPriceAlertsFormRequest(params: {
  action?: string | string[];
  editRuleId?: string | string[];
  itemName?: string | string[];
}): PriceAlertsFormRequest | null {
  const editRuleId = Array.isArray(params.editRuleId) ? params.editRuleId[0] : params.editRuleId;
  if (editRuleId) return { type: 'edit', ruleId: editRuleId };

  const action = parsePriceWatchAction(params.action);
  if (action === 'new') {
    const itemName = Array.isArray(params.itemName) ? params.itemName[0] : params.itemName;
    return { type: 'new', itemName: itemName?.trim() || undefined };
  }

  return null;
}
