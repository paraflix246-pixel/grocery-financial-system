import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

import type { SubscriptionPlan } from '@/src/store/useSubscriptionStore';

import type { StripeSubscriptionRow } from './stripe.server';

let adminClient: SupabaseClient | null | undefined;

function getSupabaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured.');
  return url;
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
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
