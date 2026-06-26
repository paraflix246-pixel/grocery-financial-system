-- User profiles synced from Supabase auth; admin control via service-role API only.

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  signup_provider text,
  plan_type text,
  subscription_status text,
  is_banned boolean NOT NULL DEFAULT false,
  banned_at timestamptz,
  banned_reason text,
  signup_source text
);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (lower(email));
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role);
CREATE INDEX IF NOT EXISTS profiles_is_banned_idx ON profiles (is_banned);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles (created_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events (actor_id);
CREATE INDEX IF NOT EXISTS audit_events_target_idx ON audit_events (target_user_id);
CREATE INDEX IF NOT EXISTS audit_events_type_idx ON audit_events (event_type);
CREATE INDEX IF NOT EXISTS audit_events_created_at_idx ON audit_events (created_at DESC);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Users may read their own profile only (role check happens server-side for admin).
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- No client INSERT/UPDATE/DELETE on profiles or audit_events — all writes via service role API.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, signup_provider, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', NEW.raw_app_meta_data->>'providers'),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_profile();

-- Promote a user to admin by email (run manually in Supabase SQL editor):
--   SELECT public.promote_admin_by_email('pennypantry02@gmail.com');
CREATE OR REPLACE FUNCTION public.promote_admin_by_email(admin_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE lower(email) = lower(trim(admin_email));
END;
$$;
