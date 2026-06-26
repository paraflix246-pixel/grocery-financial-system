import type { User } from '@supabase/supabase-js';

import {
  getSupabaseAdmin,
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

export function resolveProfileRole(email: string | null | undefined): 'user' | 'admin' {
  if (!email) return 'user';
  return parseAdminEmails().has(email.trim().toLowerCase()) ? 'admin' : 'user';
}

export function adminNotConfiguredResponse(): Response {
  return Response.json({ error: 'Admin system is not configured on the server.' }, { status: 503 });
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

  const admin = getSupabaseAdmin();
  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', actor.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load admin profile: ${error.message}`);
  }

  if (!profile || profile.role !== 'admin') return null;

  return { actor, profile: profile as ProfileRow };
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
  const email = user.email?.trim().toLowerCase() ?? null;
  const role = resolveProfileRole(email);
  const now = new Date().toISOString();

  const { data: existing } = await admin.from('profiles').select('role').eq('id', user.id).maybeSingle();

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
