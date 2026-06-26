import { PRO_FEATURE_LABELS } from '@/src/constants/proPricing';

import { getTierLimits, tierAllowsFeature } from '@/src/constants/tierLimitsConfig';

import { useSubscriptionStore, type SubscriptionTier } from '@/src/store/useSubscriptionStore';



/** Pro-gated features — unlock on Pro or Household. */

export type ProFeature =

  | 'insights_pro'

  | 'inflation_tracker'

  | 'community_pricing'

  | 'usage_analytics'

  | 'api_access'

  | 'family_plans'

  | 'price_drop_alerts';



/** Household-only features — unlock on Household tier only. */

export type HouseholdFeature =

  | 'export_advanced'

  | 'multi_user_sync'

  | 'budget_forecasting'

  | 'cheapest_basket';



export type GatedFeature = ProFeature | HouseholdFeature;



const PRO_FEATURES: ReadonlySet<ProFeature> = new Set([

  'insights_pro',

  'inflation_tracker',

  'community_pricing',

  'usage_analytics',

  'api_access',

  'family_plans',

  'price_drop_alerts',

]);



const HOUSEHOLD_FEATURES: ReadonlySet<HouseholdFeature> = new Set([

  'export_advanced',

  'multi_user_sync',

  'budget_forecasting',

  'cheapest_basket',

]);



const FEATURE_LABELS: Record<GatedFeature, string> = PRO_FEATURE_LABELS;



export function isProFeature(feature: GatedFeature): boolean {

  return PRO_FEATURES.has(feature as ProFeature);

}



export function isHouseholdFeature(feature: GatedFeature): boolean {

  return HOUSEHOLD_FEATURES.has(feature as HouseholdFeature);

}



export function getFeatureLabel(feature: GatedFeature): string {

  return FEATURE_LABELS[feature];

}



export function getRequiredTier(feature: GatedFeature): Exclude<SubscriptionTier, 'free'> {

  return isHouseholdFeature(feature) ? 'household' : 'pro';

}



/** Check whether the current subscription unlocks a feature. */

export function canAccessFeature(feature: GatedFeature): boolean {

  return tierAllowsFeature(feature, getTierLimits(useSubscriptionStore.getState().tier));

}



export function getSubscriptionTier(): SubscriptionTier {

  return useSubscriptionStore.getState().tier;

}


