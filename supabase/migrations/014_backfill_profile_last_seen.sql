-- Backfill profile activity timestamps from auth sign-in history and keep new profiles in sync.

UPDATE public.profiles p
SET
  last_seen_at = u.last_sign_in_at,
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND p.last_seen_at IS NULL
  AND u.last_sign_in_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, signup_provider, created_at, updated_at, last_seen_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', NEW.raw_app_meta_data->>'providers'),
    COALESCE(NEW.created_at, now()),
    now(),
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now(),
    last_seen_at = COALESCE(public.profiles.last_seen_at, EXCLUDED.last_seen_at);
  RETURN NEW;
END;
$$;
