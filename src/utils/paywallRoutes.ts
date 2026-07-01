export type PaywallPlanId = 'free' | 'pro' | 'family';

export const PAYWALL_ROUTE = '/paywall' as const;

type PaywallSearchParams = {
  family?: string | string[];
  plan?: string | string[];
};

const FAMILY_PLAN_ALIASES = new Set(['family', 'household', 'workspace']);

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Build paywall href; `plan=family` pre-selects the Household column. */
export function buildPaywallHref(plan?: PaywallPlanId): '/paywall' | `/paywall?plan=${PaywallPlanId}` {
  if (!plan || plan === 'pro') return PAYWALL_ROUTE;
  return `${PAYWALL_ROUTE}?plan=${plan}`;
}

/** Resolve initial plan from `?plan=family|household`, `?family=1`, etc. Defaults to Pro. */
export function parseInitialPaywallPlan(params: PaywallSearchParams): PaywallPlanId {
  const family = firstParam(params.family);
  if (family === '1' || family === 'true') return 'family';

  const plan = firstParam(params.plan)?.toLowerCase();
  if (plan && FAMILY_PLAN_ALIASES.has(plan)) return 'family';
  if (plan === 'pro') return 'pro';
  if (plan === 'free') return 'free';

  return 'pro';
}

export const PAYWALL_PLAN_SCROLL_INDEX: Record<PaywallPlanId, number> = {
  free: 0,
  pro: 1,
  family: 2,
};
