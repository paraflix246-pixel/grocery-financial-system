export type ActivitySignals = {
  lastSeenAt: string | null;
  lastSignInAt?: string | null;
  latestAuditAt?: string | null;
  createdAt?: string | null;
};

export type ProfileActivityRow = {
  id: string;
  email: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  last_seen_at: string | null;
  created_at: string;
  is_banned?: boolean;
};

export const CHURN_INACTIVE_DAYS = 30;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value || !value.trim()) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function resolveEffectiveLastSeenAt(signals: ActivitySignals): string | null {
  const candidates: Array<{ value: string; ms: number }> = [];

  for (const value of [signals.lastSeenAt, signals.lastSignInAt, signals.latestAuditAt]) {
    const ms = parseTimestamp(value);
    if (ms != null && value) {
      candidates.push({ value, ms });
    }
  }

  if (candidates.length === 0) return null;

  return candidates.reduce((latest, current) => (current.ms > latest.ms ? current : latest)).value;
}

export function computeDaysSinceActive(effectiveLastSeen: string | null, nowMs = Date.now()): number {
  const lastMs = parseTimestamp(effectiveLastSeen);
  if (lastMs == null) return 999;
  return Math.max(0, Math.floor((nowMs - lastMs) / MS_PER_DAY));
}

export function computeActivityScoreFromSignals(
  signals: ActivitySignals & { subscriptionStatus: string | null },
  nowMs = Date.now()
): number {
  const effectiveLastSeen = resolveEffectiveLastSeenAt(signals);
  const daysSinceActive = computeDaysSinceActive(effectiveLastSeen, nowMs);
  let score = Math.max(0, 100 - daysSinceActive * 3);
  if (signals.subscriptionStatus === 'active' || signals.subscriptionStatus === 'trialing') {
    score += 15;
  }
  return Math.min(100, Math.round(score));
}

export function isChurnRiskCandidate(input: {
  effectiveLastSeen: string | null;
  createdAt: string | null;
  isBanned: boolean;
  nowMs?: number;
  inactiveDays?: number;
}): boolean {
  if (input.isBanned) return false;

  const nowMs = input.nowMs ?? Date.now();
  const inactiveDays = input.inactiveDays ?? CHURN_INACTIVE_DAYS;
  const cutoffMs = nowMs - inactiveDays * MS_PER_DAY;

  const lastSeenMs = parseTimestamp(input.effectiveLastSeen);
  if (lastSeenMs != null) {
    return lastSeenMs < cutoffMs;
  }

  const createdMs = parseTimestamp(input.createdAt);
  if (createdMs == null) return false;

  return createdMs < cutoffMs;
}

export function computeChurnRiskScore(daysInactive: number, planTier: string): number {
  let score = Math.min(100, Math.round((daysInactive / 90) * 70));
  if (planTier.startsWith('Pro')) score += 20;
  return Math.min(100, score);
}

export function computeChurnDaysInactive(
  effectiveLastSeen: string | null,
  createdAt: string | null,
  nowMs = Date.now()
): number {
  if (effectiveLastSeen) {
    return Math.max(1, computeDaysSinceActive(effectiveLastSeen, nowMs));
  }
  if (createdAt) {
    return Math.max(1, computeDaysSinceActive(createdAt, nowMs));
  }
  return 90;
}

export function resolvePlanTier(profile: {
  subscription_status: string | null;
  plan_type: string | null;
}): string {
  if (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') {
    return profile.plan_type === 'yearly' ? 'Pro Yearly' : 'Pro';
  }
  return 'Free';
}

function activitySignalsForProfile(
  profile: ProfileActivityRow,
  signInByUserId: Map<string, string | null>,
  auditByUserId: Map<string, string>
): ActivitySignals & { subscriptionStatus: string | null } {
  return {
    lastSeenAt: profile.last_seen_at,
    lastSignInAt: signInByUserId.get(profile.id) ?? null,
    latestAuditAt: auditByUserId.get(profile.id) ?? null,
    createdAt: profile.created_at,
    subscriptionStatus: profile.subscription_status,
  };
}

export function rankTopUsers(
  profiles: ProfileActivityRow[],
  signInByUserId: Map<string, string | null>,
  auditByUserId: Map<string, string>,
  limit = 10,
  nowMs = Date.now()
): Array<{
  id: string;
  email: string | null;
  planTier: string;
  lastSeenAt: string | null;
  activityScore: number;
}> {
  return profiles
    .map((profile) => {
      const signals = activitySignalsForProfile(profile, signInByUserId, auditByUserId);
      const lastSeenAt = resolveEffectiveLastSeenAt(signals);
      return {
        id: profile.id,
        email: profile.email,
        planTier: resolvePlanTier(profile),
        lastSeenAt,
        activityScore: computeActivityScoreFromSignals(signals, nowMs),
      };
    })
    .sort((a, b) => {
      if (b.activityScore !== a.activityScore) return b.activityScore - a.activityScore;
      const aTime = parseTimestamp(a.lastSeenAt) ?? 0;
      const bTime = parseTimestamp(b.lastSeenAt) ?? 0;
      return bTime - aTime;
    })
    .slice(0, limit);
}

export function buildChurnRiskList(
  profiles: ProfileActivityRow[],
  signInByUserId: Map<string, string | null>,
  auditByUserId: Map<string, string>,
  options?: { limit?: number; nowMs?: number }
): Array<{
  id: string;
  email: string | null;
  planTier: string;
  lastSeenAt: string | null;
  riskScore: number;
  daysInactive: number;
}> {
  const limit = options?.limit ?? 10;
  const nowMs = options?.nowMs ?? Date.now();

  return profiles
    .filter((profile) => {
      const signals = activitySignalsForProfile(profile, signInByUserId, auditByUserId);
      const effectiveLastSeen = resolveEffectiveLastSeenAt(signals);
      return isChurnRiskCandidate({
        effectiveLastSeen,
        createdAt: profile.created_at,
        isBanned: Boolean(profile.is_banned),
        nowMs,
      });
    })
    .map((profile) => {
      const signals = activitySignalsForProfile(profile, signInByUserId, auditByUserId);
      const effectiveLastSeen = resolveEffectiveLastSeenAt(signals);
      const planTier = resolvePlanTier(profile);
      const daysInactive = computeChurnDaysInactive(effectiveLastSeen, profile.created_at, nowMs);
      return {
        id: profile.id,
        email: profile.email,
        planTier,
        lastSeenAt: effectiveLastSeen,
        daysInactive,
        riskScore: computeChurnRiskScore(daysInactive, planTier),
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

export function computeExclusiveTierCounts(
  profiles: Array<{ id: string; subscription_status: string | null }>,
  familyOwnerIds: Set<string>
): { tierFree: number; tierPro: number; tierFamily: number } {
  let tierPro = 0;
  let tierFamily = 0;
  let tierFree = 0;

  for (const profile of profiles) {
    const isPro =
      profile.subscription_status === 'active' || profile.subscription_status === 'trialing';
    const isFamily = familyOwnerIds.has(profile.id);
    if (isPro) {
      tierPro += 1;
    } else if (isFamily) {
      tierFamily += 1;
    } else {
      tierFree += 1;
    }
  }

  return { tierFree, tierPro, tierFamily };
}

export function countOnlineUsers(
  profiles: Array<{ id: string; last_seen_at: string | null; created_at?: string }>,
  signInByUserId: Map<string, string | null>,
  auditByUserId: Map<string, string>,
  onlineCutoffMs: number
): number {
  let count = 0;
  for (const profile of profiles) {
    const effectiveLastSeen = resolveEffectiveLastSeenAt({
      lastSeenAt: profile.last_seen_at,
      lastSignInAt: signInByUserId.get(profile.id) ?? null,
      latestAuditAt: auditByUserId.get(profile.id) ?? null,
      createdAt: profile.created_at ?? null,
    });
    const lastMs = parseTimestamp(effectiveLastSeen);
    if (lastMs != null && lastMs >= onlineCutoffMs) {
      count += 1;
    }
  }
  return count;
}

export function buildLastSeenBackfillUpdates(input: {
  profiles: Array<{ id: string; last_seen_at: string | null }>;
  signInByUserId: Map<string, string | null>;
  auditByUserId: Map<string, string>;
}): Array<{ id: string; last_seen_at: string }> {
  const updates: Array<{ id: string; last_seen_at: string }> = [];

  for (const profile of input.profiles) {
    if (profile.last_seen_at) continue;

    const resolved = resolveEffectiveLastSeenAt({
      lastSeenAt: null,
      lastSignInAt: input.signInByUserId.get(profile.id) ?? null,
      latestAuditAt: input.auditByUserId.get(profile.id) ?? null,
    });

    if (resolved) {
      updates.push({ id: profile.id, last_seen_at: resolved });
    }
  }

  return updates;
}
