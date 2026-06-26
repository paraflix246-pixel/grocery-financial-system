-- Stripe web subscriptions (linked to Supabase auth users).
-- Written by server API routes using the service role key; clients read via /api/stripe/subscription-status.

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'inactive',
  plan text CHECK (plan IS NULL OR plan IN ('monthly', 'yearly')),
  current_period_end timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_subscriptions_customer_idx ON stripe_subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS stripe_subscriptions_subscription_idx ON stripe_subscriptions (stripe_subscription_id);

ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own stripe subscription"
  ON stripe_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
