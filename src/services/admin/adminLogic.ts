export type AdminFeatureFlagKey =
  | 'receipt_scanning_paused'
  | 'price_compare_paused'
  | 'new_signups_paused';

export type AlertSettings = {
  email?: string;
  slackWebhook?: string;
  thresholds?: {
    errorRatePercent?: number;
    pastDueCount?: number;
    churnRiskCount?: number;
  };
};

export type AbuseHeuristicCounts = {
  bannedAccounts: number;
  pastDueSubscriptions: number;
  signupsLast24h: number;
  signupsLastHour: number;
  openFeedback: number;
  highVolumeEmailDomains: number;
};

export function isFeatureFlagEnabled(
  flags: Record<string, unknown>,
  key: AdminFeatureFlagKey
): boolean {
  return flags[key] === true;
}

export function computeUserHealthScore(input: {
  activityScore: number;
  receiptCount: number;
  subscriptionStatus: string | null;
}): number {
  let score = input.activityScore * 0.5;
  score += Math.min(30, input.receiptCount * 3);
  if (input.subscriptionStatus === 'active' || input.subscriptionStatus === 'trialing') {
    score += 20;
  }
  return Math.min(100, Math.round(score));
}

export function resolveStripeMode(secretKey: string | undefined): 'test' | 'live' | 'unknown' {
  const key = secretKey?.trim() ?? '';
  if (key.startsWith('sk_test_')) return 'test';
  if (key.startsWith('sk_live_')) return 'live';
  return 'unknown';
}

export function computeAbuseHeuristics(input: {
  bannedCount: number;
  pastDueCount: number;
  signupsLast24h: number;
  signupsLastHour: number;
  openFeedback: number;
  highVolumeEmailDomains: number;
}): AbuseHeuristicCounts {
  return {
    bannedAccounts: input.bannedCount,
    pastDueSubscriptions: input.pastDueCount,
    signupsLast24h: input.signupsLast24h,
    signupsLastHour: input.signupsLastHour,
    openFeedback: input.openFeedback,
    highVolumeEmailDomains: input.highVolumeEmailDomains,
  };
}

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(escapeCsvValue).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function mergeFeatureFlags(
  current: Record<string, unknown>,
  patch: Partial<Record<AdminFeatureFlagKey, boolean>>
): Record<string, unknown> {
  return { ...current, ...patch };
}

export function normalizeAlertSettings(raw: unknown): AlertSettings {
  if (!raw || typeof raw !== 'object') return {};
  const value = raw as Record<string, unknown>;
  const thresholdsRaw =
    value.thresholds && typeof value.thresholds === 'object'
      ? (value.thresholds as Record<string, unknown>)
      : null;

  return {
    email: typeof value.email === 'string' ? value.email.trim() : undefined,
    slackWebhook: typeof value.slackWebhook === 'string' ? value.slackWebhook.trim() : undefined,
    thresholds: thresholdsRaw
      ? {
          errorRatePercent:
            typeof thresholdsRaw.errorRatePercent === 'number'
              ? thresholdsRaw.errorRatePercent
              : undefined,
          pastDueCount:
            typeof thresholdsRaw.pastDueCount === 'number' ? thresholdsRaw.pastDueCount : undefined,
          churnRiskCount:
            typeof thresholdsRaw.churnRiskCount === 'number'
              ? thresholdsRaw.churnRiskCount
              : undefined,
        }
      : undefined,
  };
}
