CREATE TABLE IF NOT EXISTS job_workspace_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_by text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  entry_type text NOT NULL,
  visibility text NOT NULL DEFAULT 'shared',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  amount integer,
  status text NOT NULL DEFAULT 'open',
  media_url text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_workspace_entry_type_check CHECK (entry_type IN ('task','note','progress','material','expense','snag','document','handover','warranty')),
  CONSTRAINT job_workspace_visibility_check CHECK (visibility IN ('shared','trader_only')),
  CONSTRAINT job_workspace_status_check CHECK (status IN ('open','done','shared','approved','archived')),
  CONSTRAINT job_workspace_amount_check CHECK (amount IS NULL OR amount >= 0)
);
CREATE INDEX IF NOT EXISTS job_workspace_entries_job_idx ON job_workspace_entries(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_workspace_entries_due_idx ON job_workspace_entries(job_id, due_at) WHERE due_at IS NOT NULL;
