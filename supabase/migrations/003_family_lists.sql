-- Family shared shopping lists (anonymous member_id, same pattern as price_records).

CREATE TABLE IF NOT EXISTS family_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_groups_code_idx ON family_groups (code);

CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  member_id text NOT NULL,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, member_id)
);

CREATE INDEX IF NOT EXISTS family_members_group_idx ON family_members (group_id);

CREATE TABLE IF NOT EXISTS shared_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  local_list_id text,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  updated_by_name text
);

CREATE INDEX IF NOT EXISTS shared_lists_group_idx ON shared_lists (group_id);
CREATE INDEX IF NOT EXISTS shared_lists_group_local_idx ON shared_lists (group_id, local_list_id);

ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read family_groups"
  ON family_groups FOR SELECT
  USING (true);

CREATE POLICY "Public insert family_groups"
  ON family_groups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public read family_members"
  ON family_members FOR SELECT
  USING (true);

CREATE POLICY "Public insert family_members"
  ON family_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public read shared_lists"
  ON shared_lists FOR SELECT
  USING (true);

CREATE POLICY "Public insert shared_lists"
  ON shared_lists FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update shared_lists"
  ON shared_lists FOR UPDATE
  USING (true);

-- Enable Realtime: in Supabase Dashboard → Database → Replication,
-- add shared_lists to the supabase_realtime publication.
