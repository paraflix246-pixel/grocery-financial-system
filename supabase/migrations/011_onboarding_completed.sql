-- Persist onboarding completion on user profiles (source of truth for authenticated users).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Existing accounts have already passed onboarding.
UPDATE profiles
SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at, now())
WHERE onboarding_completed_at IS NULL;
