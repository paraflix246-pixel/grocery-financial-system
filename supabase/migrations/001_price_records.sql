CREATE TABLE IF NOT EXISTS price_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  price decimal(10,2) NOT NULL,
  store_name text NOT NULL,
  store_address text,
  store_city text,
  store_state text,
  store_zip text,
  scan_date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_date date,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON price_records (item_name);
CREATE INDEX ON price_records (store_name);
CREATE INDEX ON price_records (scan_date);
