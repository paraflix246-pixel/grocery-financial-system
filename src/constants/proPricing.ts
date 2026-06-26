export const CORE_NARRATIVE =
  'Penny Pantry tracks every receipt so you see what you really spend, which prices are climbing, and where inflation is quietly eating your budget.';

export const ONBOARDING_UPGRADE_HEADLINE = 'Save money every time you shop.';

export const PAYWALL_HEADLINE = 'Save money every time you shop.';

export const PAYWALL_SUBHEAD =
  'Track prices, catch drops, and see where your money actually goes.';

export const PRO_CTA_LABEL = 'Start 7-Day Pro Trial';

export const PRO_CTA_SUBTEXT = 'Full Pro access for 7 days. No payment required.';

export const PRO_SUBSCRIBE_LABEL = 'Subscribe to Pro';

export const TRIAL_BADGE_LABEL = (daysRemaining: number) =>
  `Pro trial — ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left`;

export const PRO_BADGE_LABEL = 'Best for families';

export const PRO_PLAN_LEAD = 'Everything Free, plus:';

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

export const FREE_PLAN_FEATURES = [
  `${FREE_RECEIPT_SCAN_LIMIT} receipt scans/month`,
  'Basic grocery list',
  `${FREE_PRICE_HISTORY_DAYS}-day price history`,
  'Manual price alerts',
  `${FREE_MAX_STORES} store tracking`,
  `Pantry up to ${FREE_PANTRY_MAX_ITEMS} items`,
] as const;

export const PRO_PLAN_FEATURES = [
  'Unlimited receipt scans',
  'Full price history (all purchases)',
  'Smart sale alerts for tracked items',
  'Multi-store price comparison',
  'Household sync (family/roommates)',
  'Monthly spending overview',
  'Cheapest cart across stores',
  'Export spending data',
  'Unlimited pantry tracking',
  'Ad-free experience (when ads are shown on Free)',
] as const;

export const PRO_PLAN_FEATURE_GROUPS = [
  {
    title: 'Receipts & prices',
    items: [PRO_PLAN_FEATURES[0], PRO_PLAN_FEATURES[1], PRO_PLAN_FEATURES[2]],
  },
  {
    title: 'Stores & savings',
    items: [PRO_PLAN_FEATURES[3], PRO_PLAN_FEATURES[6]],
  },
  {
    title: 'Family & budget',
    items: [PRO_PLAN_FEATURES[4], PRO_PLAN_FEATURES[5]],
  },
  {
    title: 'Export & pantry',
    items: [PRO_PLAN_FEATURES[7], PRO_PLAN_FEATURES[8]],
  },
  {
    title: 'Experience',
    items: [PRO_PLAN_FEATURES[9]],
  },
] as const;

export const PRO_UPGRADE_HOOK = PAYWALL_SUBHEAD;

export const UNLIMITED_PANTRY_LABEL = PRO_PLAN_FEATURES[8];
export const UNLIMITED_SCANNING_LABEL = PRO_PLAN_FEATURES[0];

/** User-facing names for gated modules — sourced from plan feature copy above. */
export const PRO_FEATURE_LABELS = {
  insights_pro: 'See where your grocery budget goes',
  inflation_tracker: 'See how inflation is hitting your basket',
  community_pricing: PRO_PLAN_FEATURES[3],
  usage_analytics: PRO_PLAN_FEATURES[1],
  family_plans: 'Share lists with family — everyone stays in sync',
  price_drop_alerts: PRO_PLAN_FEATURES[2],
  export_advanced: PRO_PLAN_FEATURES[7],
  multi_user_sync: PRO_PLAN_FEATURES[4],
  budget_forecasting: PRO_PLAN_FEATURES[5],
  cheapest_basket: PRO_PLAN_FEATURES[6],
  api_access: PRO_PLAN_FEATURES[3],
  pantry_unlimited: UNLIMITED_PANTRY_LABEL,
} as const;
