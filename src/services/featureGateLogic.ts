export type WorkspaceGatedFeature = 'family_plans' | 'multi_user_sync';

export type PersonalGatedFeature =
  | 'insights_pro'
  | 'inflation_tracker'
  | 'community_pricing'
  | 'usage_analytics'
  | 'api_access'
  | 'price_drop_alerts'
  | 'export_advanced'
  | 'budget_forecasting'
  | 'cheapest_basket';

export type GatedFeature = PersonalGatedFeature | WorkspaceGatedFeature;

const WORKSPACE_FEATURES = new Set<GatedFeature>(['family_plans', 'multi_user_sync']);

export function isWorkspaceGatedFeature(feature: GatedFeature): boolean {
  return WORKSPACE_FEATURES.has(feature);
}
