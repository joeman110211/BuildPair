CREATE TABLE IF NOT EXISTS user_presence (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_path text,
  client_platform text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_presence_last_seen_idx ON user_presence(last_seen_at DESC);
