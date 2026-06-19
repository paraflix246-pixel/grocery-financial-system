import { useSubscriptionStore } from '@/src/store/useSubscriptionStore';

/** Pro-gated features. Extend this list as new premium modules ship. */
export type ProFeature =
  | 'insights_pro'
  | 'inflation_tracker'
  | 'community_pricing'
  | 'usage_analytics'
  | 'api_access'
  | 'family_plans'
  | 'export_advanced';

const PRO_FEATURES: ReadonlySet<ProFeature> = new Set([
  'insights_pro',
  'inflation_tracker',
  'community_pricing',
  'usage_analytics',
  'api_access',
  'family_plans',
  'export_advanced',
]);

const FEATURE_LABELS: Record<ProFeature, string> = {
  insights_pro: 'AI Insights Pro',
  inflation_tracker: 'Personal Inflation Tracker',
  community_pricing: 'Community Price Data',
  usage_analytics: 'Advanced Usage Analytics',
  api_access: 'Developer API Access',
  family_plans: 'Family Plans',
  export_advanced: 'Advanced Export',
};

export function isProFeature(feature: ProFeature): boolean {
  return PRO_FEATURES.has(feature);
}

export function getFeatureLabel(feature: ProFeature): string {
  return FEATURE_LABELS[feature];
}

/** Check whether the current subscription unlocks a feature. */
export function canAccessFeature(feature: ProFeature): boolean {
  if (!isProFeature(feature)) return true;
  return useSubscriptionStore.getState().isPro();
}

export function getSubscriptionTier(): 'free' | 'pro' {
  return useSubscriptionStore.getState().tier;
}
