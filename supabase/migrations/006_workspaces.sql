-- Personal vs Family workspace architecture.
-- Workspaces are household containers with a Family subscription (one payer).
-- Personal Pro remains on stripe_subscriptions / user tier — never auto-merged.

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Household',
  owner_user_id text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  stripe_subscription_id text UNIQUE,
  subscription_status text NOT NULL DEFAULT 'inactive',
  subscription_plan text CHECK (subscription_plan IS NULL OR subscription_plan IN ('monthly', 'yearly')),
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces (owner_user_id);
CREATE INDEX IF NOT EXISTS workspaces_invite_code_idx ON workspaces (invite_code);
CREATE INDEX IF NOT EXISTS workspaces_stripe_sub_idx ON workspaces (stripe_subscription_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members (user_id);

-- Link shared lists to workspaces (parallel to legacy group_id).
ALTER TABLE shared_lists
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS shared_lists_workspace_idx ON shared_lists (workspace_id);

-- Workspace-scoped receipt sync (optional cloud mirror; local SQLite remains source for personal).
CREATE TABLE IF NOT EXISTS workspace_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  local_receipt_id text,
  store_name text NOT NULL,
  receipt_date date NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_receipts_workspace_idx ON workspace_receipts (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_receipts_local_idx ON workspace_receipts (workspace_id, local_receipt_id);

CREATE UNIQUE INDEX IF NOT EXISTS workspace_receipts_workspace_local_unique
  ON workspace_receipts (workspace_id, local_receipt_id)
  WHERE local_receipt_id IS NOT NULL;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_receipts ENABLE ROW LEVEL SECURITY;

-- MVP policies (match family_lists openness; tighten with auth.uid() when all clients use Supabase auth).
CREATE POLICY "Public read workspaces"
  ON workspaces FOR SELECT
  USING (true);

CREATE POLICY "Public insert workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update workspaces"
  ON workspaces FOR UPDATE
  USING (true);

CREATE POLICY "Public read workspace_members"
  ON workspace_members FOR SELECT
  USING (true);

CREATE POLICY "Public insert workspace_members"
  ON workspace_members FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public read workspace_receipts"
  ON workspace_receipts FOR SELECT
  USING (true);

CREATE POLICY "Public insert workspace_receipts"
  ON workspace_receipts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update workspace_receipts"
  ON workspace_receipts FOR UPDATE
  USING (true);

-- Enable Realtime: add shared_lists + workspace_receipts to supabase_realtime publication.
