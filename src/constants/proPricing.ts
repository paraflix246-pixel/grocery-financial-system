export const CORE_NARRATIVE =
  'Penny Pantry tracks every receipt so you see what you really spend, which prices are climbing, and where inflation is quietly eating your budget.';

export const ONBOARDING_UPGRADE_HEADLINE = 'Keep saving money automatically.';

export const SUBSCRIPTION_HEADLINE = 'Keep saving money automatically.';

export const SUBSCRIPTION_SUBHEAD =
  'Pro and Household keep catching waste, duplicate rebuys, and money leaks for you.';

export const PAYWALL_HEADLINE = 'Stop wasting money on food you already bought.';

export const PAYWALL_SUBHEAD =
  'Catch duplicate rebuys, expiring pantry items, and money leaks before they hit your wallet.';

export const PRO_CTA_LABEL = 'Start 7-Day Pro Trial';

export const PRO_CTA_SUBTEXT = 'Full Pro access for 7 days. No payment required.';

export const PRO_SUBSCRIBE_LABEL = 'Subscribe to Pro';

export const TRIAL_BADGE_LABEL = (daysRemaining: number) =>
  `Pro trial — ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`;

export const PRO_BADGE_LABEL = 'Solo shoppers';

export const FAMILY_BADGE_LABEL = 'Recommended';

export const FAMILY_MONTHLY_PRICE = '$4.99';
export const FAMILY_YEARLY_PRICE = '$49.99';
export const FAMILY_YEARLY_PRICE_PER_MONTH = '$4.17';

export const FAMILY_PLAN_LEAD = 'One shared household economy:';

export const FAMILY_SUBSCRIBE_LABEL = 'Subscribe to Family';

export const FAMILY_CTA_SUBTEXT = 'One subscription for your household. Invite members free.';

export const PRO_PLAN_LEAD = 'Your loss-prevention engine:';

export const CONTINUE_FREE_LABEL = 'Continue with Free';

export const COMMIT_NOTE = 'Cancel anytime — no contracts.';

export const FREE_RECEIPT_SCAN_LIMIT = 5;
export const FREE_PRICE_HISTORY_DAYS = 14;
export const FREE_PANTRY_MAX_ITEMS = 10;
export const FREE_MAX_STORES = 2;

export const PRO_MONTHLY_PRICE = '$3.99';
export const PRO_YEARLY_PRICE = '$39.99';
export const PRO_YEARLY_PRICE_PER_MONTH = '$3.33';

export const YEARLY_SAVINGS_PERCENT = 17;

export const proMonthlyLabel = `${PRO_MONTHLY_PRICE}/mo`;
export const proYearlyLabel = `${PRO_YEARLY_PRICE}/yr`;

/** Currency amount for i18n keys that append a localized "/mo" suffix (e.g. upgrade CTAs). */
export function formatProMonthlyPrice(): string {
  return PRO_MONTHLY_PRICE;
}

export const FREE_PLAN_FEATURES = [
  `${FREE_RECEIPT_SCAN_LIMIT} receipt scans/month`,
  'Basic grocery list',
  `${FREE_PRICE_HISTORY_DAYS}-day price history`,
  'Manual price alerts',
  `${FREE_MAX_STORES} store tracking`,
  `Pantry up to ${FREE_PANTRY_MAX_ITEMS} items`,
] as const;

export const PRO_PLAN_FEATURES = [
  'Waste prevention — expiry & pantry alerts',
  'Smart rebuy — catch duplicate purchases',
  'Money leak tracking — see what is at risk',
  'Pantry automation — unlimited items from receipts',
  'Full price history (all purchases)',
  'Smart sale alerts for tracked items',
  'Cheapest cart across stores',
  'Export spending data',
  'Ad-free experience (when ads are shown on Free)',
  'Custom app themes & colors',
  'Custom fonts',
  'Custom avatars',
] as const;

export const FAMILY_PLAN_FEATURES = [
  'All Pro loss-prevention for every member',
  'Shared shopping lists — one household economy',
  'Live multi-user sync across phones',
  'Invite family members free — no Pro required',
  'Save receipts to your household workspace',
  'One payer funds the whole household',
] as const;

export const PRO_PLAN_FEATURE_GROUPS = [
  {
    title: 'Receipts & prices',
    items: [PRO_PLAN_FEATURES[0], PRO_PLAN_FEATURES[1], PRO_PLAN_FEATURES[2]],
  },
  {
    title: 'Stores & savings',
    items: [PRO_PLAN_FEATURES[3], PRO_PLAN_FEATURES[5]],
  },
  {
    title: 'Budget',
    items: [PRO_PLAN_FEATURES[4]],
  },
  {
    title: 'Export & pantry',
    items: [PRO_PLAN_FEATURES[6], PRO_PLAN_FEATURES[7]],
  },
  {
    title: 'Experience',
    items: [PRO_PLAN_FEATURES[8], PRO_PLAN_FEATURES[9], PRO_PLAN_FEATURES[10], PRO_PLAN_FEATURES[11]],
  },
] as const;

export const FAMILY_PLAN_FEATURE_GROUPS = [
  {
    title: 'Household sharing',
    items: [FAMILY_PLAN_FEATURES[0], FAMILY_PLAN_FEATURES[1], FAMILY_PLAN_FEATURES[2]],
  },
  {
    title: 'Workspace',
    items: [FAMILY_PLAN_FEATURES[3], FAMILY_PLAN_FEATURES[4]],
  },
] as const;

export const PRO_UPGRADE_HOOK = PAYWALL_SUBHEAD;

export const UNLIMITED_PANTRY_LABEL = PRO_PLAN_FEATURES[7];
export const UNLIMITED_SCANNING_LABEL = PRO_PLAN_FEATURES[0];

/** User-facing names for gated modules — sourced from plan feature copy above. */
export const PRO_FEATURE_LABELS = {
  insights_pro: 'Full money leak report',
  inflation_tracker: 'Track inflation eating your budget',
  community_pricing: 'Multi-store price comparison',
  usage_analytics: 'Full purchase history',
  family_plans: 'Shared household economy',
  price_drop_alerts: 'Smart rebuy & sale alerts',
  export_advanced: PRO_PLAN_FEATURES[7],
  multi_user_sync: FAMILY_PLAN_FEATURES[2],
  budget_forecasting: 'Money leak & spending overview',
  cheapest_basket: PRO_PLAN_FEATURES[6],
  api_access: 'Multi-store price comparison',
  pantry_unlimited: 'Unlimited pantry automation',
  custom_themes: PRO_PLAN_FEATURES[9],
  custom_fonts: PRO_PLAN_FEATURES[10],
  custom_avatars: PRO_PLAN_FEATURES[11],
} as const;
