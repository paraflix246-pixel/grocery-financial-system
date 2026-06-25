-- Row Level Security for community price_records.
-- The app uses the anon key with a local anonymous user_id (not auth.uid()).
-- Allow public read for price comparison and public insert for contributions.

ALTER TABLE price_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read price_records"
  ON price_records FOR SELECT
  USING (true);

CREATE POLICY "Public insert price_records"
  ON price_records FOR INSERT
  WITH CHECK (true);
