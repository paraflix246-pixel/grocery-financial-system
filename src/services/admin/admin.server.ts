import type { User } from '@supabase/supabase-js';

import {
  getSupabaseAdmin,
  getMissingSupabaseAdminEnvVars,
  getUserFromAuthHeader,
  isSupabaseAdminConfigured,
} from '@/src/services/stripe/stripeSupabase.server';

export type ProfileRow = {
  id: string;
  email: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  signup_provider: string | null;
  plan_type: string | null;
  subscription_status: string | null;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  signup_source: string | null;
  onboarding_completed_at: string | null;
};

export type AuditEventRow = {
  id: string;
  actor_id: string | null;
  target_user_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminContext = {
  actor: User;
  profile: ProfileRow;
};

function parseAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim() ?? '';
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function resolveAuthUserEmail(user: User): string | null {
  const direct = normalizeEmail(user.email);
  if (direct) return direct;

  const metaEmail = normalizeEmail(user.user_metadata?.email);
  if (metaEmail) return metaEmail;

  for (const identity of user.identities ?? []) {
    const identityEmail = normalizeEmail(identity.identity_data?.email);
    if (identityEmail) return identityEmail;
  }

  return null;
}

export function resolveProfileRole(email: string | null | undefined): 'user' | 'admin' {
  if (!email) return 'user';
  return parseAdminEmails().has(email.trim().toLowerCase()) ? 'admin' : 'user';
}

export function adminNotConfiguredResponse(): Response {
  const missing = getMissingSupabaseAdminEnvVars();
  if (missing.length > 0) {
    console.warn('[admin] not configured — missing env:', missing.join(', '));
  }

  const hint = missing.includes('SUPABASE_SERVICE_ROLE_KEY')
    ? 'Add SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard → Project Settings → API Keys (secret or service_role). Set it in .env for local dev or Vercel env for production, then restart the server.'
    : 'Set the missing env vars in .env for local dev or Vercel env for production, then restart the server.';

  return Response.json(
    {
      error: 'Admin system is not configured on the server.',
      missingEnv: missing,
      hint,
    },
    { status: 503 }
  );
}

export function adminUnauthorizedResponse(): Response {
  return Response.json({ error: 'Sign in required.' }, { status: 401 });
}

export function adminForbiddenResponse(): Response {
  return Response.json({ error: 'Admin access required.' }, { status: 403 });
}

export async function requireAdmin(request: Request): Promise<AdminContext | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const actor = await getUserFromAuthHeader(request);
  if (!actor) return null;

  // Sync profile on every admin check so ADMIN_EMAILS promotions apply even when
  // the client never called /api/profile/sync or the row was created as role=user.
  const profile = await upsertProfileFromAuthUser(actor);
  if (profile.role !== 'admin') return null;

  return { actor, profile };
}

export async function logAuditEvent(input: {
  actorId: string;
  targetUserId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('audit_events').insert({
    actor_id: input.actorId,
    target_user_id: input.targetUserId ?? null,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.warn('[admin] audit log failed:', error.message);
  }
}

function extractSignupProvider(user: User): string | null {
  const provider = user.app_metadata?.provider;
  if (typeof provider === 'string' && provider.trim()) return provider.trim();
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    return String(providers[0]);
  }
  return null;
}

export async function upsertProfileFromAuthUser(user: User): Promise<ProfileRow> {
  const admin = getSupabaseAdmin();
  const email = resolveAuthUserEmail(user);
  const role = resolveProfileRole(email);
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from('profiles')
    .select('role, onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle();

  const effectiveRole =
    existing?.role === 'admin' || role === 'admin' ? 'admin' : 'user';

  const { data, error } = await admin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email,
        role: effectiveRole,
        last_seen_at: now,
        signup_provider: extractSignupProvider(user),
        onboarding_completed_at: existing?.onboarding_completed_at ?? now,
        updated_at: now,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not sync profile.');
  }

  await syncProfileSubscriptionFields(user.id);

  const { data: refreshed } = await admin.from('profiles').select('*').eq('id', user.id).single();
  return (refreshed ?? data) as ProfileRow;
}

async function syncProfileSubscriptionFields(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: sub } = await admin
    .from('stripe_subscriptions')
    .select('status, plan')
    .eq('user_id', userId)
    .maybeSingle();

  if (!sub) return;

  await admin
    .from('profiles')
    .update({
      subscription_status: sub.status ?? null,
      plan_type: sub.plan ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

export type DailyCount = { date: string; count: number };

export type AdminTopUser = {
  id: string;
  email: string | null;
  planTier: string;
  lastSeenAt: string | null;
  activityScore: number;
};

export type AdminChurnUser = {
  id: string;
  email: string | null;
  planTier: string;
  lastSeenAt: string | null;
  riskScore: number;
  daysInactive: number;
};

export type AdminAnalytics = {
  totalUsers: number;
  signupsToday: number;
  proCount: number;
  bannedCount: number;
  onlineNow: number;
  receiptScansToday: number;
  pendingSignups: number;
  paymentsToday: number;
  premiumUsers: number;
  systemHealth: 'healthy' | 'degraded' | 'unknown';
  revenue30Day: number;
  revenue30DayNote: string;
  flaggedAccounts: number;
  supportTickets: number;
  tierFree: number;
  tierPro: number;
  tierFamily: number;
  totalReceiptScans: number;
  completedParses: number;
  completionRate: number;
  shoppingListsCreated: number;
  priceComparisonsRun: number;
  totalProRevenuePotential: number;
  dailySignups: DailyCount[];
  dailyScans: DailyCount[];
  cumulativeUsers: DailyCount[];
  topUsers: AdminTopUser[];
  churnRisk: AdminChurnUser[];
  recentActivity: AuditEventRow[];
  stripeConfigured: boolean;
  resendConfigured: boolean;
};

const PRO_MONTHLY_MRR = 3.99;
const PRO_YEARLY_MRR = 39.99 / 12;
const FAMILY_MONTHLY_MRR = 4.99;
const FAMILY_YEARLY_MRR = 49.99 / 12;

function startOfUtcDay(date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function isoDateKey(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

function buildDailySeries(
  rows: Array<{ created_at: string }>,
  days: number
): DailyCount[] {
  const start = startOfUtcDay();
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const buckets = new Map<string, number>();

  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    buckets.set(isoDateKey(d), 0);
  }

  for (const row of rows) {
    const key = isoDateKey(row.created_at);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

function buildCumulativeSeries(dailySignups: DailyCount[], baseBeforePeriod: number): DailyCount[] {
  let running = baseBeforePeriod;
  return dailySignups.map(({ date, count }) => {
    running += count;
    return { date, count: running };
  });
}

function resolvePlanTier(profile: Pick<ProfileRow, 'subscription_status' | 'plan_type'>): string {
  if (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') {
    return profile.plan_type === 'yearly' ? 'Pro Yearly' : 'Pro';
  }
  return 'Free';
}

function estimateMrrFromStripePlans(
  subs: Array<{ plan: string | null; status: string }>
): number {
  let mrr = 0;
  for (const sub of subs) {
    if (sub.status !== 'active' && sub.status !== 'trialing') continue;
    if (sub.plan === 'yearly') mrr += PRO_YEARLY_MRR;
    else mrr += PRO_MONTHLY_MRR;
  }
  return Math.round(mrr * 100) / 100;
}

function estimateFamilyMrr(
  workspaces: Array<{ subscription_plan: string | null; subscription_status: string }>
): number {
  let mrr = 0;
  for (const ws of workspaces) {
    if (ws.subscription_status !== 'active' && ws.subscription_status !== 'trialing') continue;
    if (ws.subscription_plan === 'yearly') mrr += FAMILY_YEARLY_MRR;
    else mrr += FAMILY_MONTHLY_MRR;
  }
  return Math.round(mrr * 100) / 100;
}

function computeRiskScore(daysInactive: number, planTier: string): number {
  let score = Math.min(100, Math.round((daysInactive / 90) * 70));
  if (planTier.startsWith('Pro')) score += 20;
  return Math.min(100, score);
}

function computeActivityScore(
  profile: Pick<ProfileRow, 'created_at' | 'last_seen_at' | 'subscription_status'>
): number {
  const lastSeen = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
  const daysSinceActive = lastSeen
    ? Math.max(0, Math.floor((Date.now() - lastSeen) / (1000 * 60 * 60 * 24)))
    : 999;
  let score = Math.max(0, 100 - daysSinceActive * 3);
  if (profile.subscription_status === 'active' || profile.subscription_status === 'trialing') {
    score += 15;
  }
  return Math.min(100, Math.round(score));
}

async function safeTableCount(table: string): Promise<number | null> {
  const admin = getSupabaseAdmin();
  const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true });
  if (error) {
    console.warn(`[admin/analytics] ${table} count failed:`, error.message);
    return null;
  }
  return count ?? 0;
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const admin = getSupabaseAdmin();
  const todayStart = startOfUtcDay();
  const todayIso = todayStart.toISOString();
  const onlineCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const thirtyDaysIso = thirtyDaysAgo.toISOString();
  const inactiveCutoff = thirtyDaysIso;

  const baseStats = await getAdminStats();

  const [
    onlineRes,
    pendingRes,
    paymentsTodayRes,
    receiptsTodayRes,
    totalReceiptsRes,
    sharedListsRes,
    priceRecordsRes,
    familyActiveRes,
    profilesRecentRes,
    receiptsRecentRes,
    profilesBeforeRes,
    topProfilesRes,
    churnProfilesRes,
    auditRes,
    stripeSubsRes,
    familySubsRes,
  ] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }).gte('last_seen_at', onlineCutoff),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayIso)
      .is('last_seen_at', null),
    admin
      .from('stripe_subscriptions')
      .select('user_id', { count: 'exact', head: true })
      .gte('updated_at', todayIso)
      .in('status', ['active', 'trialing']),
    admin
      .from('workspace_receipts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayIso),
    safeTableCount('workspace_receipts'),
    safeTableCount('shared_lists'),
    safeTableCount('price_records'),
    admin
      .from('workspaces')
      .select('id', { count: 'exact', head: true })
      .in('subscription_status', ['active', 'trialing']),
    admin.from('profiles').select('created_at').gte('created_at', thirtyDaysIso),
    admin.from('workspace_receipts').select('created_at').gte('created_at', thirtyDaysIso),
    admin.from('profiles').select('id', { count: 'exact', head: true }).lt('created_at', thirtyDaysIso),
    admin
      .from('profiles')
      .select('id, email, plan_type, subscription_status, last_seen_at, created_at')
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(10),
    admin
      .from('profiles')
      .select('id, email, plan_type, subscription_status, last_seen_at')
      .or(`last_seen_at.lt.${inactiveCutoff},last_seen_at.is.null`)
      .eq('is_banned', false)
      .order('last_seen_at', { ascending: true, nullsFirst: true })
      .limit(15),
    admin.from('audit_events').select('*').order('created_at', { ascending: false }).limit(25),
    admin.from('stripe_subscriptions').select('plan, status'),
    admin
      .from('workspaces')
      .select('subscription_plan, subscription_status')
      .in('subscription_status', ['active', 'trialing']),
  ]);

  const familyActive = familyActiveRes.error ? 0 : (familyActiveRes.count ?? 0);
  const tierPro = baseStats.proCount;
  const tierFamily = familyActive;
  const tierFree = Math.max(0, baseStats.totalUsers - tierPro);

  const dailySignups = buildDailySeries(
    (profilesRecentRes.data ?? []) as Array<{ created_at: string }>,
    30
  );
  const dailyScans = buildDailySeries(
    (receiptsRecentRes.data ?? []) as Array<{ created_at: string }>,
    30
  );
  const cumulativeUsers = buildCumulativeSeries(
    dailySignups,
    profilesBeforeRes.error ? 0 : (profilesBeforeRes.count ?? 0)
  );

  const stripeSubs = (stripeSubsRes.data ?? []) as Array<{ plan: string | null; status: string }>;
  const familySubs = (familySubsRes.data ?? []) as Array<{
    subscription_plan: string | null;
    subscription_status: string;
  }>;
  const proMrr = estimateMrrFromStripePlans(stripeSubs);
  const familyMrr = estimateFamilyMrr(familySubs);
  const totalMrr = proMrr + familyMrr;

  const totalReceiptScans = totalReceiptsRes ?? 0;
  const completedParses = totalReceiptScans;
  const completionRate =
    totalReceiptScans > 0 ? Math.min(100, Math.round((completedParses / totalReceiptScans) * 100)) : 0;

  const topUsers: AdminTopUser[] = ((topProfilesRes.data ?? []) as ProfileRow[]).map((profile) => ({
    id: profile.id,
    email: profile.email,
    planTier: resolvePlanTier(profile),
    lastSeenAt: profile.last_seen_at,
    activityScore: computeActivityScore(profile),
  }));

  const churnRisk: AdminChurnUser[] = ((churnProfilesRes.data ?? []) as ProfileRow[])
    .slice(0, 10)
    .map((profile) => {
      const lastSeenMs = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
      const daysInactive = lastSeenMs
        ? Math.max(1, Math.floor((Date.now() - lastSeenMs) / (1000 * 60 * 60 * 24)))
        : 90;
      const planTier = resolvePlanTier(profile);
      return {
        id: profile.id,
        email: profile.email,
        planTier,
        lastSeenAt: profile.last_seen_at,
        daysInactive,
        riskScore: computeRiskScore(daysInactive, planTier),
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  const hasStripeTable = !stripeSubsRes.error;
  const revenue30Day = hasStripeTable ? Math.round(totalMrr * 100) / 100 : 0;
  const supportTickets = await countOpenSupportTickets();

  let systemHealth: AdminAnalytics['systemHealth'] = 'healthy';
  if (!isSupabaseAdminConfigured()) {
    systemHealth = 'unknown';
  } else if (stripeSubsRes.error) {
    systemHealth = 'degraded';
  }

  return {
    ...baseStats,
    onlineNow: onlineRes.error ? 0 : (onlineRes.count ?? 0),
    receiptScansToday: receiptsTodayRes.error ? 0 : (receiptsTodayRes.count ?? 0),
    pendingSignups: pendingRes.error ? 0 : (pendingRes.count ?? 0),
    paymentsToday: paymentsTodayRes.error ? 0 : (paymentsTodayRes.count ?? 0),
    premiumUsers: tierPro + tierFamily,
    systemHealth,
    revenue30Day,
    revenue30DayNote: hasStripeTable
      ? 'Estimated MRR from active Pro + Family subscriptions'
      : 'Stripe subscription data not available — apply migrations and connect billing',
    flaggedAccounts: baseStats.bannedCount,
    supportTickets,
    tierFree,
    tierPro,
    tierFamily,
    totalReceiptScans,
    completedParses,
    completionRate,
    shoppingListsCreated: sharedListsRes ?? 0,
    priceComparisonsRun: priceRecordsRes ?? 0,
    totalProRevenuePotential: revenue30Day,
    dailySignups,
    dailyScans,
    cumulativeUsers,
    topUsers,
    churnRisk,
    recentActivity: (auditRes.data ?? []) as AuditEventRow[],
    stripeConfigured: hasStripeTable,
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
  };
}

export async function sendReEngagementEmail(input: {
  actorId: string;
  targetUserId: string;
}): Promise<void> {
  const { sendViaResend } = await import('@/src/services/auth/resendEmail.server');
  const admin = getSupabaseAdmin();

  const { data: profile, error } = await admin
    .from('profiles')
    .select('email, is_banned')
    .eq('id', input.targetUserId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile?.email) throw new Error('User has no email on file.');
  if (profile.is_banned) throw new Error('Cannot email a banned account.');

  const appUrl =
    process.env.EXPO_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') || 'https://pennypantry.xyz';

  await sendViaResend(
    profile.email,
    'We miss you at Penny Pantry',
    `<p>Hi there,</p>
<p>It's been a while since you opened Penny Pantry. Your grocery budget insights, price alerts, and lists are waiting.</p>
<p><a href="${appUrl}">Open Penny Pantry</a></p>
<p>— The Penny Pantry team</p>`
  );

  const { logEmailEvent } = await import('@/src/services/admin/emailLog.server');
  await logEmailEvent({
    userId: input.targetUserId,
    email: profile.email,
    emailType: 're_engagement',
    status: 'sent',
  });

  await logAuditEvent({
    actorId: input.actorId,
    targetUserId: input.targetUserId,
    eventType: 'admin.re_engagement_email',
  });
}

export async function getAdminStats(): Promise<{
  totalUsers: number;
  signupsToday: number;
  proCount: number;
  bannedCount: number;
}> {
  const admin = getSupabaseAdmin();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [totalRes, todayRes, proRes, bannedRes] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayIso),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('subscription_status', ['active', 'trialing']),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
  ]);

  if (totalRes.error) throw new Error(totalRes.error.message);
  if (todayRes.error) throw new Error(todayRes.error.message);
  if (proRes.error) throw new Error(proRes.error.message);
  if (bannedRes.error) throw new Error(bannedRes.error.message);

  return {
    totalUsers: totalRes.count ?? 0,
    signupsToday: todayRes.count ?? 0,
    proCount: proRes.count ?? 0,
    bannedCount: bannedRes.count ?? 0,
  };
}

export async function listProfiles(input: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ users: ProfileRow[]; total: number; page: number; limit: number }> {
  const admin = getSupabaseAdmin();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 25));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const search = input.search?.trim().toLowerCase();

  let query = admin.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('email', `%${search}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  return {
    users: (data ?? []) as ProfileRow[],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getProfileDetail(userId: string): Promise<{
  profile: ProfileRow;
  authUser: User | null;
  auditEvents: AuditEventRow[];
}> {
  const admin = getSupabaseAdmin();

  const [{ data: profile, error: profileError }, { data: authData }, { data: auditEvents }] =
    await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      admin.auth.admin.getUserById(userId),
      admin
        .from('audit_events')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error('User not found.');

  return {
    profile: profile as ProfileRow,
    authUser: authData.user ?? null,
    auditEvents: (auditEvents ?? []) as AuditEventRow[],
  };
}

export async function banUser(input: {
  actorId: string;
  targetUserId: string;
  reason: string;
}): Promise<ProfileRow> {
  if (input.actorId === input.targetUserId) {
    throw new Error('You cannot ban your own account.');
  }

  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const reason = input.reason.trim() || 'Banned by admin';

  const { error: banError } = await admin.auth.admin.updateUserById(input.targetUserId, {
    ban_duration: '876000h',
    user_metadata: { is_banned: true, banned_reason: reason, banned_at: now },
  });

  if (banError) throw new Error(banError.message);

  const { data, error } = await admin
    .from('profiles')
    .update({
      is_banned: true,
      banned_at: now,
      banned_reason: reason,
      updated_at: now,
    })
    .eq('id', input.targetUserId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Could not update profile.');

  await logAuditEvent({
    actorId: input.actorId,
    targetUserId: input.targetUserId,
    eventType: 'user.banned',
    metadata: { reason },
  });

  return data as ProfileRow;
}

export async function unbanUser(input: {
  actorId: string;
  targetUserId: string;
}): Promise<ProfileRow> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: authData } = await admin.auth.admin.getUserById(input.targetUserId);
  const existingMeta = authData.user?.user_metadata ?? {};

  const { error: unbanError } = await admin.auth.admin.updateUserById(input.targetUserId, {
    ban_duration: 'none',
    user_metadata: {
      ...existingMeta,
      is_banned: false,
      banned_reason: null,
      banned_at: null,
    },
  });

  if (unbanError) throw new Error(unbanError.message);

  const { data, error } = await admin
    .from('profiles')
    .update({
      is_banned: false,
      banned_at: null,
      banned_reason: null,
      updated_at: now,
    })
    .eq('id', input.targetUserId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Could not update profile.');

  await logAuditEvent({
    actorId: input.actorId,
    targetUserId: input.targetUserId,
    eventType: 'user.unbanned',
  });

  return data as ProfileRow;
}

export async function deleteUserAsAdmin(input: {
  actorId: string;
  targetUserId: string;
}): Promise<void> {
  if (input.actorId === input.targetUserId) {
    throw new Error('You cannot delete your own account from admin.');
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(input.targetUserId);
  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorId: input.actorId,
    targetUserId: input.targetUserId,
    eventType: 'user.deleted',
  });
}

// --- Platform admin sections (health, messages, emails, payments, support, feedback, settings) ---

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export type HealthCheckItem = {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
  latencyMs?: number;
};

export type AdminHealthReport = {
  overall: HealthStatus;
  checks: HealthCheckItem[];
  errorRate24h: number;
  errors24h: number;
  events24h: number;
  lastDeployAt: string | null;
  deployCommit: string | null;
  deployEnv: string | null;
};

export type AdminMessageRow = {
  id: string;
  title: string;
  body: string;
  audience: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
};

export type EmailLogRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  email_type: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminPaymentRow = {
  id: string;
  product: 'pro' | 'family';
  userId: string | null;
  email: string | null;
  plan: string | null;
  status: string;
  amountMonthly: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  cancelAtPeriodEnd: boolean;
};

export type AdminPaymentsSummary = {
  mrr: number;
  activeCount: number;
  trialingCount: number;
  pastDueCount: number;
  canceledCount: number;
  failedPayments: number;
  trialConversions30d: number;
};

export type SupportItemRow = {
  id: string;
  type: 'feedback' | 'ban' | 'privacy';
  status: string;
  userId: string | null;
  email: string | null;
  summary: string;
  createdAt: string;
};

export type UserFeedbackRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  message: string;
  category: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PlatformSettings = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  featureFlags: Record<string, unknown>;
  adminEmails: string[];
  adminEmailsMasked: string[];
  stripeConfigured: boolean;
  resendConfigured: boolean;
  updatedAt: string | null;
};

export type AdminNavBadgeCounts = {
  messages: number;
  support: number;
};

export function maskEmail(email: string): string {
  const normalized = email.trim();
  const at = normalized.indexOf('@');
  if (at <= 0) return '***';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const maskedLocal =
    local.length <= 2 ? `${local[0] ?? '*'}***` : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

function healthFromLatency(latencyMs: number, ok: boolean): HealthStatus {
  if (!ok) return 'down';
  if (latencyMs > 3000) return 'degraded';
  return 'healthy';
}

async function probeUrl(url: string, timeoutMs = 5000): Promise<{ ok: boolean; latencyMs: number; detail: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    const latencyMs = Date.now() - start;
    return {
      ok: response.ok,
      latencyMs,
      detail: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      detail: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

export async function getAdminHealth(requestOrigin?: string): Promise<AdminHealthReport> {
  const admin = getSupabaseAdmin();
  const checks: HealthCheckItem[] = [];
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const supabaseStart = Date.now();
  const { error: supabaseError } = await admin.from('profiles').select('id', { count: 'exact', head: true });
  const supabaseLatency = Date.now() - supabaseStart;
  checks.push({
    key: 'supabase',
    label: 'Supabase',
    status: healthFromLatency(supabaseLatency, !supabaseError),
    detail: supabaseError ? supabaseError.message : `Profiles reachable (${supabaseLatency}ms)`,
    latencyMs: supabaseLatency,
  });

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  checks.push({
    key: 'stripe',
    label: 'Stripe',
    status: stripeConfigured ? 'healthy' : 'degraded',
    detail: stripeConfigured ? 'API key configured' : 'STRIPE_SECRET_KEY not set',
  });

  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  checks.push({
    key: 'resend',
    label: 'Resend email',
    status: resendConfigured ? 'healthy' : 'degraded',
    detail: resendConfigured ? 'API key configured' : 'RESEND_API_KEY not set',
  });

  const { isScraperApiConfigured } = await import('@/src/services/scraperapi/scraperApi.server');
  const scraperapiConfigured = isScraperApiConfigured();
  checks.push({
    key: 'scraperapi',
    label: 'ScraperAPI (Walmart)',
    status: scraperapiConfigured ? 'healthy' : 'degraded',
    detail: scraperapiConfigured ? 'API key configured' : 'SCRAPERAPI_API_KEY not set',
  });

  const { resolveProductionSafeUrl } = await import('@/src/utils/productionEnvGuard');
  const paddleUrl = resolveProductionSafeUrl(process.env.PADDLEOCR_API_URL, 'PADDLEOCR_API_URL');
  if (paddleUrl) {
    const ocrProbe = await probeUrl(`${paddleUrl.replace(/\/$/, '')}/health`);
    checks.push({
      key: 'ocr',
      label: 'PaddleOCR',
      status: healthFromLatency(ocrProbe.latencyMs, ocrProbe.ok),
      detail: ocrProbe.detail,
      latencyMs: ocrProbe.latencyMs,
    });
  } else {
    checks.push({
      key: 'ocr',
      label: 'PaddleOCR',
      status: 'unknown',
      detail: 'PADDLEOCR_API_URL not configured',
    });
  }

  if (requestOrigin) {
    const apiProbe = await probeUrl(`${requestOrigin.replace(/\/$/, '')}/api/platform/status`);
    checks.push({
      key: 'api',
      label: 'App API',
      status: healthFromLatency(apiProbe.latencyMs, apiProbe.ok),
      detail: apiProbe.detail,
      latencyMs: apiProbe.latencyMs,
    });
  }

  const [audit24hRes, errors24hRes] = await Promise.all([
    admin.from('audit_events').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
    admin
      .from('audit_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', dayAgo)
      .or('event_type.ilike.%error%,event_type.ilike.%failed%'),
  ]);

  const events24h = audit24hRes.error ? 0 : (audit24hRes.count ?? 0);
  const errors24h = errors24hRes.error ? 0 : (errors24hRes.count ?? 0);
  const errorRate24h = events24h > 0 ? Math.round((errors24h / events24h) * 100) : 0;

  const statuses = checks.map((c) => c.status);
  let overall: HealthStatus = 'healthy';
  if (statuses.includes('down')) overall = 'down';
  else if (statuses.includes('degraded')) overall = 'degraded';
  else if (statuses.every((s) => s === 'unknown')) overall = 'unknown';

  return {
    overall,
    checks,
    errorRate24h,
    errors24h,
    events24h,
    lastDeployAt: process.env.VERCEL_DEPLOYMENT_ID ? new Date().toISOString() : null,
    deployCommit: process.env.VERCEL_GIT_COMMIT_SHA?.trim() ?? null,
    deployEnv: process.env.VERCEL_ENV?.trim() ?? process.env.NODE_ENV ?? null,
  };
}

export async function listAdminMessages(): Promise<AdminMessageRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('admin_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminMessageRow[];
}

export async function createAdminMessage(input: {
  actorId: string;
  title: string;
  body: string;
  audience?: string;
  expiresAt?: string | null;
}): Promise<AdminMessageRow> {
  const admin = getSupabaseAdmin();
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) throw new Error('Title and body are required.');

  const { data, error } = await admin
    .from('admin_messages')
    .insert({
      title,
      body,
      audience: input.audience?.trim() || 'all',
      created_by: input.actorId,
      expires_at: input.expiresAt ?? null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Could not create message.');

  await logAuditEvent({
    actorId: input.actorId,
    eventType: 'admin.message_created',
    metadata: { messageId: data.id, title },
  });

  return data as AdminMessageRow;
}

export async function listEmailLog(limit = 50): Promise<EmailLogRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('email_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as EmailLogRow[];
}

const PRO_MONTHLY = 3.99;
const PRO_YEARLY_MONTHLY = 39.99 / 12;
const FAMILY_MONTHLY = 4.99;
const FAMILY_YEARLY_MONTHLY = 49.99 / 12;

function planMonthlyAmount(plan: string | null, product: 'pro' | 'family'): number {
  if (plan === 'yearly') {
    return product === 'family' ? FAMILY_YEARLY_MONTHLY : PRO_YEARLY_MONTHLY;
  }
  return product === 'family' ? FAMILY_MONTHLY : PRO_MONTHLY;
}

export async function getAdminPayments(): Promise<{
  subscriptions: AdminPaymentRow[];
  summary: AdminPaymentsSummary;
}> {
  const admin = getSupabaseAdmin();

  const [subsRes, workspacesRes, profilesRes] = await Promise.all([
    admin.from('stripe_subscriptions').select('*').order('created_at', { ascending: false }),
    admin.from('workspaces').select('*').order('created_at', { ascending: false }),
    admin.from('profiles').select('id, email'),
  ]);

  if (subsRes.error) throw new Error(subsRes.error.message);
  if (workspacesRes.error) throw new Error(workspacesRes.error.message);

  const emailByUserId = new Map<string, string | null>();
  for (const row of profilesRes.data ?? []) {
    emailByUserId.set(row.id as string, row.email as string | null);
  }

  const subscriptions: AdminPaymentRow[] = [];

  for (const sub of subsRes.data ?? []) {
    const userId = sub.user_id as string;
    subscriptions.push({
      id: userId,
      product: 'pro',
      userId,
      email: emailByUserId.get(userId) ?? null,
      plan: sub.plan as string | null,
      status: sub.status as string,
      amountMonthly: planMonthlyAmount(sub.plan as string | null, 'pro'),
      stripeCustomerId: sub.stripe_customer_id as string,
      stripeSubscriptionId: sub.stripe_subscription_id as string | null,
      currentPeriodEnd: sub.current_period_end as string | null,
      createdAt: sub.created_at as string,
      cancelAtPeriodEnd: sub.status === 'canceled' || sub.status === 'cancelled',
    });
  }

  for (const ws of workspacesRes.data ?? []) {
    const ownerId = ws.owner_user_id as string;
    subscriptions.push({
      id: ws.id as string,
      product: 'family',
      userId: ownerId,
      email: emailByUserId.get(ownerId) ?? null,
      plan: ws.subscription_plan as string | null,
      status: ws.subscription_status as string,
      amountMonthly: planMonthlyAmount(ws.subscription_plan as string | null, 'family'),
      stripeCustomerId: null,
      stripeSubscriptionId: ws.stripe_subscription_id as string | null,
      currentPeriodEnd: ws.current_period_end as string | null,
      createdAt: ws.created_at as string,
      cancelAtPeriodEnd: ws.subscription_status === 'canceled',
    });
  }

  subscriptions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  let mrr = 0;
  let activeCount = 0;
  let trialingCount = 0;
  let pastDueCount = 0;
  let canceledCount = 0;

  for (const row of subscriptions) {
    if (row.status === 'active') {
      activeCount += 1;
      mrr += row.amountMonthly;
    } else if (row.status === 'trialing') {
      trialingCount += 1;
      mrr += row.amountMonthly;
    } else if (row.status === 'past_due') {
      pastDueCount += 1;
    } else if (row.status === 'canceled' || row.status === 'cancelled') {
      canceledCount += 1;
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const trialConversions30d = subscriptions.filter(
    (s) => s.status === 'active' && new Date(s.createdAt) >= thirtyDaysAgo
  ).length;

  return {
    subscriptions,
    summary: {
      mrr: Math.round(mrr * 100) / 100,
      activeCount,
      trialingCount,
      pastDueCount,
      canceledCount,
      failedPayments: pastDueCount,
      trialConversions30d,
    },
  };
}

export async function listSupportItems(): Promise<SupportItemRow[]> {
  const admin = getSupabaseAdmin();
  const items: SupportItemRow[] = [];

  const [feedbackRes, bannedRes, auditRes] = await Promise.all([
    admin
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30),
    admin
      .from('profiles')
      .select('id, email, banned_reason, banned_at')
      .eq('is_banned', true)
      .order('banned_at', { ascending: false })
      .limit(20),
    admin
      .from('audit_events')
      .select('*')
      .or('event_type.eq.user.deleted,event_type.ilike.%privacy%')
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  for (const fb of feedbackRes.data ?? []) {
    items.push({
      id: fb.id as string,
      type: 'feedback',
      status: fb.status as string,
      userId: fb.user_id as string | null,
      email: fb.email as string | null,
      summary: String(fb.message).slice(0, 120),
      createdAt: fb.created_at as string,
    });
  }

  for (const profile of bannedRes.data ?? []) {
    items.push({
      id: `ban-${profile.id}`,
      type: 'ban',
      status: 'banned',
      userId: profile.id as string,
      email: profile.email as string | null,
      summary: (profile.banned_reason as string) ?? 'Banned account',
      createdAt: (profile.banned_at as string) ?? new Date().toISOString(),
    });
  }

  for (const event of auditRes.data ?? []) {
    items.push({
      id: event.id as string,
      type: 'privacy',
      status: event.event_type as string,
      userId: event.target_user_id as string | null,
      email: null,
      summary: JSON.stringify(event.metadata ?? {}).slice(0, 120),
      createdAt: event.created_at as string,
    });
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return items.slice(0, 50);
}

export async function listUserFeedback(limit = 50): Promise<UserFeedbackRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('user_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as UserFeedbackRow[];
}

export async function updateFeedbackStatus(input: {
  actorId: string;
  feedbackId: string;
  status: 'open' | 'reviewed' | 'resolved';
}): Promise<UserFeedbackRow> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('user_feedback')
    .update({ status: input.status })
    .eq('id', input.feedbackId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Could not update feedback.');

  await logAuditEvent({
    actorId: input.actorId,
    targetUserId: data.user_id ?? undefined,
    eventType: 'admin.feedback_status',
    metadata: { feedbackId: input.feedbackId, status: input.status },
  });

  return data as UserFeedbackRow;
}

export async function listAuditEvents(input: {
  page?: number;
  limit?: number;
  eventType?: string;
}): Promise<{ events: AuditEventRow[]; total: number; page: number; limit: number }> {
  const admin = getSupabaseAdmin();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 30));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = admin.from('audit_events').select('*', { count: 'exact' }).order('created_at', {
    ascending: false,
  });

  const eventType = input.eventType?.trim();
  if (eventType && eventType !== 'all') {
    query = query.eq('event_type', eventType);
  }

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  return {
    events: (data ?? []) as AuditEventRow[],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('platform_config').select('*').eq('id', 1).maybeSingle();

  const adminEmails = Array.from(parseAdminEmails());
  const adminEmailsMasked = adminEmails.map(maskEmail);

  if (error) {
    console.warn('[admin/settings] platform_config read failed:', error.message);
  }

  return {
    maintenanceMode: Boolean(data?.maintenance_mode),
    maintenanceMessage:
      (data?.maintenance_message as string) ??
      'Penny Pantry is undergoing maintenance. Please try again shortly.',
    featureFlags: (data?.feature_flags as Record<string, unknown>) ?? {},
    adminEmails,
    adminEmailsMasked,
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    updatedAt: (data?.updated_at as string) ?? null,
  };
}

export async function updatePlatformSettings(input: {
  actorId: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  featureFlags?: Record<string, unknown>;
}): Promise<PlatformSettings> {
  const admin = getSupabaseAdmin();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: input.actorId,
  };

  if (typeof input.maintenanceMode === 'boolean') patch.maintenance_mode = input.maintenanceMode;
  if (typeof input.maintenanceMessage === 'string') {
    patch.maintenance_message = input.maintenanceMessage.trim() || 'Penny Pantry is undergoing maintenance.';
  }
  if (input.featureFlags) patch.feature_flags = input.featureFlags;

  const { error } = await admin.from('platform_config').upsert({ id: 1, ...patch }, { onConflict: 'id' });
  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorId: input.actorId,
    eventType: 'admin.settings_updated',
    metadata: {
      maintenanceMode: input.maintenanceMode,
      featureFlags: input.featureFlags,
    },
  });

  return getPlatformSettings();
}

export async function getPublicPlatformStatus(): Promise<{
  maintenanceMode: boolean;
  maintenanceMessage: string;
  activeMessages: Array<{ id: string; title: string; body: string; created_at: string }>;
}> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const [configRes, messagesRes] = await Promise.all([
    admin.from('platform_config').select('maintenance_mode, maintenance_message').eq('id', 1).maybeSingle(),
    admin
      .from('admin_messages')
      .select('id, title, body, created_at')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return {
    maintenanceMode: Boolean(configRes.data?.maintenance_mode),
    maintenanceMessage:
      (configRes.data?.maintenance_message as string) ??
      'Penny Pantry is undergoing maintenance. Please try again shortly.',
    activeMessages: (messagesRes.data ?? []) as Array<{
      id: string;
      title: string;
      body: string;
      created_at: string;
    }>,
  };
}

export async function submitUserFeedback(input: {
  userId?: string | null;
  email?: string | null;
  message: string;
  category?: string;
}): Promise<UserFeedbackRow> {
  const admin = getSupabaseAdmin();
  const message = input.message.trim();
  if (!message) throw new Error('Feedback message is required.');

  const { data, error } = await admin
    .from('user_feedback')
    .insert({
      user_id: input.userId ?? null,
      email: input.email ?? null,
      message,
      category: input.category?.trim() || 'general',
      status: 'open',
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Could not submit feedback.');

  if (input.userId) {
    await logAuditEvent({
      actorId: input.userId,
      eventType: 'user.feedback_submitted',
      metadata: { feedbackId: data.id, category: data.category },
    });
  }

  return data as UserFeedbackRow;
}

export async function getAdminNavBadges(): Promise<AdminNavBadgeCounts> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();

  const [messagesRes, feedbackRes, bannedRes] = await Promise.all([
    admin
      .from('admin_messages')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`),
    admin.from('user_feedback').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('is_banned', true),
  ]);

  const openFeedback = feedbackRes.error ? 0 : (feedbackRes.count ?? 0);
  const banned = bannedRes.error ? 0 : (bannedRes.count ?? 0);

  return {
    messages: messagesRes.error ? 0 : (messagesRes.count ?? 0),
    support: openFeedback + banned,
  };
}

async function countOpenSupportTickets(): Promise<number> {
  const admin = getSupabaseAdmin();
  const { count, error } = await admin
    .from('user_feedback')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  if (error) return 0;
  return count ?? 0;
}
