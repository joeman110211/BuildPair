CREATE TABLE IF NOT EXISTS trader_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('quote', 'message')),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trader_templates_trader_kind_idx
  ON trader_templates(trader_id, kind, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS trader_templates_unique_title_idx
  ON trader_templates(trader_id, kind, lower(title));
