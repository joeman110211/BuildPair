CREATE TABLE IF NOT EXISTS user_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  path text,
  flow text,
  step text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_activity_events_user_time_idx
  ON user_activity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_events_flow_time_idx
  ON user_activity_events(flow, created_at DESC);
CREATE INDEX IF NOT EXISTS user_activity_events_type_time_idx
  ON user_activity_events(event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS user_flow_drafts (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flow text NOT NULL,
  current_step text,
  status text NOT NULL DEFAULT 'in_progress',
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (user_id, flow),
  CONSTRAINT user_flow_drafts_status_valid CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

CREATE INDEX IF NOT EXISTS user_flow_drafts_status_time_idx
  ON user_flow_drafts(status, updated_at DESC);
