-- Finish the whole-job retention layer: reminders, quote choices, aftercare and calendar feeds.

ALTER TABLE business_quotes
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_days integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS business_quote_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES business_quotes(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'optional',
  group_key text,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_adjustment integer NOT NULL DEFAULT 0,
  selected boolean NOT NULL DEFAULT false,
  selected_at timestamptz,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_quote_option_kind_check CHECK (kind IN ('optional','alternative')),
  CONSTRAINT business_quote_option_price_check CHECK (price_adjustment >= 0)
);
CREATE INDEX IF NOT EXISTS business_quote_options_quote_idx ON business_quote_options(quote_id, sort_order);

CREATE TABLE IF NOT EXISTS project_aftercare_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  note text NOT NULL DEFAULT '',
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  last_sent_at timestamptz,
  send_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_aftercare_status_check CHECK (status IN ('pending','sent','done','dismissed'))
);
CREATE INDEX IF NOT EXISTS project_aftercare_due_idx ON project_aftercare_reminders(status, due_at);
CREATE INDEX IF NOT EXISTS project_aftercare_job_idx ON project_aftercare_reminders(job_id, due_at);

CREATE TABLE IF NOT EXISTS trader_calendar_feeds (
  trader_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trader_addon_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addon_key text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'requested',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trader_addon_key_check CHECK (addon_key IN ('opportunity_pack','team_seat','ai_credits','sms_credits')),
  CONSTRAINT trader_addon_quantity_check CHECK (quantity BETWEEN 1 AND 100),
  CONSTRAINT trader_addon_status_check CHECK (status IN ('requested','active','declined','cancelled'))
);
CREATE INDEX IF NOT EXISTS trader_addon_requests_trader_idx ON trader_addon_requests(trader_id, created_at DESC);
