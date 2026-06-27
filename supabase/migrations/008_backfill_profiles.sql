-- Backfill profiles for auth users created before 007_admin_profiles.sql was applied.

INSERT INTO public.profiles (id, email, signup_provider, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_app_meta_data->>'provider', u.raw_app_meta_data->>'providers'),
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
