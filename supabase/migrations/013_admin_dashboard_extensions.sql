-- Admin dashboard extensions: profile locale, login gate, alert settings.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS locale text CHECK (locale IS NULL OR locale IN ('en', 'es'));

CREATE INDEX IF NOT EXISTS profiles_locale_idx ON profiles (locale);

ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS disable_logins boolean NOT NULL DEFAULT false;

ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS alert_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
