export const CORE_NARRATIVE =
  'Penny Pantry tracks every receipt so you see what you really spend, which prices are climbing, and where inflation is quietly eating your budget.';

export const ONBOARDING_UPGRADE_HEADLINE = 'Stop overpaying for groceries';

export const PAYWALL_HEADLINE = 'Pick the plan that pays for itself';

export const PAYWALL_SUBHEAD =
  'Most members spot savings on their very first shop — price drops, store swaps, and inflation you would have missed.';

export const PRO_CTA_LABEL = 'Start saving with Pro';

export const PRO_BADGE_LABEL = 'Best for families';

export const CONTINUE_FREE_LABEL = 'Try Free first';

export const COMMIT_NOTE = 'Cancel anytime — no contracts.';

export const FREE_RECEIPT_SCAN_LIMIT = 10;
export const FREE_PRICE_HISTORY_DAYS = 14;
export const FREE_PANTRY_MAX_ITEMS = 15;
export const FREE_MAX_STORES = 1;

export const PRO_MONTHLY_PRICE = '$3.99';
export const PRO_YEARLY_PRICE = '$39.99';
export const PRO_YEARLY_PRICE_PER_MONTH = '$3.33';

export const YEARLY_SAVINGS_PERCENT = 17;

export const proMonthlyLabel = `${PRO_MONTHLY_PRICE}/mo`;
export const proYearlyLabel = `${PRO_YEARLY_PRICE}/yr`;

export const FREE_PLAN_FEATURES = [
  `Try with up to ${FREE_RECEIPT_SCAN_LIMIT} receipt scans/month`,
  'Build a basic grocery list',
  `Spot recent price changes (${FREE_PRICE_HISTORY_DAYS}-day history)`,
  'Set price alerts manually',
  'Track one store at a time',
  `Pantry capped at ${FREE_PANTRY_MAX_ITEMS} items`,
] as const;

export const PRO_PLAN_FEATURES = [
  'Scan unlimited receipts — catch every price change',
  'Full price history — see what you have actually paid',
  'Get alerted the moment your staples go on sale',
  'Compare live prices across all your stores',
  'Sync with family or roommates in real time',
  'Forecast grocery spend before month-end surprises',
  'Auto-find the cheapest basket across your stores',
  'Export CSV & tax-ready spending logs',
  'Track your whole pantry — no item limits',
] as const;

export const PRO_UPGRADE_HOOK =
  'Know about price drops and inflation before you fill your cart — not after you check out.';

export const UNLIMITED_PANTRY_LABEL = PRO_PLAN_FEATURES[8];
export const UNLIMITED_SCANNING_LABEL = PRO_PLAN_FEATURES[0];

/** User-facing names for gated modules — sourced from plan feature copy above. */
export const PRO_FEATURE_LABELS = {
  insights_pro: 'Know exactly where your grocery budget goes',
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
