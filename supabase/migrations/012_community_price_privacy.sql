-- Privacy-hardened community price_records: optional anonymous contributor, no street addresses required.
ALTER TABLE price_records ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE price_records ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE price_records ADD COLUMN IF NOT EXISTS package_size text;
ALTER TABLE price_records ADD COLUMN IF NOT EXISTS quantity decimal(10,2);

COMMENT ON COLUMN price_records.user_id IS
  'Random device-scoped contributor id for deduplication — not linked to auth accounts.';
