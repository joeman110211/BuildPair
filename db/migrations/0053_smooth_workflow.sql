-- Smooth whole-job workflow: quote choices, private calendar feeds, reminder audit and aftercare.
ALTER TABLE job_workspace_entries DROP CONSTRAINT IF EXISTS job_workspace_entry_type_check;
ALTER TABLE job_workspace_entries ADD CONSTRAINT job_workspace_entry_type_check
  CHECK (entry_type IN ('task','note','progress','material','expense','snag','document','handover','warranty','aftercare'));

CREATE TABLE IF NOT EXISTS business_quote_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES business_quotes(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'optional' CHECK (kind IN ('optional','alternative')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_delta integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_quote_option_title_check CHECK (char_length(trim(title)) BETWEEN 2 AND 180)
);
CREATE INDEX IF NOT EXISTS business_quote_options_quote_idx ON business_quote_options(quote_id, sort_order);

ALTER TABLE business_quotes
  ADD COLUMN IF NOT EXISTS accepted_option_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  ADD COLUMN IF NOT EXISTS accepted_total_amount integer;

CREATE TABLE IF NOT EXISTS trader_calendar_tokens (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  regenerated_at timestamptz
);

CREATE TABLE IF NOT EXISTS business_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_kind text NOT NULL CHECK (reminder_kind IN ('quote','invoice','aftercare')),
  entity_id text NOT NULL,
  recipient_email text,
  reminder_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reminder_kind, entity_id, reminder_key)
);
CREATE INDEX IF NOT EXISTS business_reminder_log_trader_idx
  ON business_reminder_log(trader_id, sent_at DESC);
