import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import type { SubscriptionPlan } from '@/src/store/useSubscriptionStore';

import type { StripeSubscriptionRow } from './stripe.server';

export type WorkspaceStripeRow = {
  id: string;
  owner_user_id: string;
  stripe_subscription_id: string | null;
  subscription_status: string;
  subscription_plan: SubscriptionPlan | null;
  current_period_end: string | null;
};

let adminClient: SupabaseClient | null | undefined;

function getSupabaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured.');
  return url;
}

export function getMissingSupabaseAdminEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()) {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  return missing;
}

export function isSupabaseAdminConfigured(): boolean {
  return getMissingSupabaseAdminEnvVars().length === 0;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient !== undefined) return adminClient as SupabaseClient;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  }

  adminClient = createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export async function getUserFromAuthHeader(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonKey) return null;

  const client = createClient(getSupabaseUrl(), anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function getStripeSubscriptionForUser(
  userId: string
): Promise<StripeSubscriptionRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('stripe_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load Stripe subscription: ${error.message}`);
  }

  return (data as StripeSubscriptionRow | null) ?? null;
}

export async function upsertStripeSubscription(row: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId?: string | null;
  status: string;
  plan?: SubscriptionPlan | null;
  currentPeriodEnd?: string | null;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('stripe_subscriptions').upsert(
    {
      user_id: row.userId,
      stripe_customer_id: row.stripeCustomerId,
      stripe_subscription_id: row.stripeSubscriptionId ?? null,
      status: row.status,
      plan: row.plan ?? null,
      current_period_end: row.currentPeriodEnd ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw new Error(`Failed to save Stripe subscription: ${error.message}`);
  }
}

export async function getWorkspaceForOwner(userId: string): Promise<WorkspaceStripeRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('workspaces')
    .select('id, owner_user_id, stripe_subscription_id, subscription_status, subscription_plan, current_period_end')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load workspace: ${error.message}`);
  }

  return (data as WorkspaceStripeRow | null) ?? null;
}

export async function getWorkspaceByStripeSubscriptionId(
  subscriptionId: string
): Promise<WorkspaceStripeRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('workspaces')
    .select('id, owner_user_id, stripe_subscription_id, subscription_status, subscription_plan, current_period_end')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load workspace by subscription: ${error.message}`);
  }

  return (data as WorkspaceStripeRow | null) ?? null;
}

export async function upsertWorkspaceStripeSubscription(row: {
  workspaceId: string;
  stripeSubscriptionId: string;
  status: string;
  plan?: SubscriptionPlan | null;
  currentPeriodEnd?: string | null;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('workspaces')
    .update({
      stripe_subscription_id: row.stripeSubscriptionId,
      subscription_status: row.status,
      subscription_plan: row.plan ?? null,
      current_period_end: row.currentPeriodEnd ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', row.workspaceId);

  if (error) {
    throw new Error(`Failed to save workspace subscription: ${error.message}`);
  }
}

export async function createWorkspaceForOwner(userId: string, name = 'My Household'): Promise<string> {
  const admin = getSupabaseAdmin();
  const inviteCode = generateInviteCode();
  const { data, error } = await admin
    .from('workspaces')
    .insert({
      name,
      owner_user_id: userId,
      invite_code: inviteCode,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not create workspace.');
  }

  await admin.from('workspace_members').upsert(
    { workspace_id: data.id, user_id: userId, role: 'owner' },
    { onConflict: 'workspace_id,user_id' }
  );

  return data.id as string;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let raw = '';
  for (let i = 0; i < 8; i++) {
    raw += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}
