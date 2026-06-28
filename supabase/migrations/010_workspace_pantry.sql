-- Shared household pantry items (Supabase mirror; personal pantry stays in SQLite).

CREATE TABLE IF NOT EXISTS workspace_pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  amount numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'ea',
  added_date date NOT NULL DEFAULT CURRENT_DATE,
  shelf_life_days integer NOT NULL DEFAULT 0,
  low_stock_threshold numeric NOT NULL DEFAULT 1,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_pantry_workspace_idx ON workspace_pantry_items (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_pantry_name_idx ON workspace_pantry_items (workspace_id, name);

ALTER TABLE workspace_pantry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read workspace_pantry_items"
  ON workspace_pantry_items FOR SELECT
  USING (true);

CREATE POLICY "Public insert workspace_pantry_items"
  ON workspace_pantry_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update workspace_pantry_items"
  ON workspace_pantry_items FOR UPDATE
  USING (true);

CREATE POLICY "Public delete workspace_pantry_items"
  ON workspace_pantry_items FOR DELETE
  USING (true);
