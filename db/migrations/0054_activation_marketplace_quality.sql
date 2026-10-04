-- BuildPair2 activation, marketplace quality and workflow upgrades.
-- Adds quick proposals, automatic reminder preferences and richer site-visit slot handling
-- without changing existing customer-facing wording or existing records.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS response_limit integer NOT NULL DEFAULT 5;

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_response_limit_valid;
ALTER TABLE jobs ADD CONSTRAINT jobs_response_limit_valid CHECK (response_limit BETWEEN 1 AND 25);

CREATE TABLE IF NOT EXISTS job_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_min integer,
  price_max integer,
  earliest_start_at timestamptz,
  message text NOT NULL DEFAULT '',
  portfolio_photos text[] NOT NULL DEFAULT ARRAY[]::text[],
  requires_site_visit boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent','shortlisted','declined','withdrawn','converted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_proposals_price_min_valid CHECK (price_min IS NULL OR price_min >= 0),
  CONSTRAINT job_proposals_price_max_valid CHECK (price_max IS NULL OR price_max >= 0),
  CONSTRAINT job_proposals_price_range_valid CHECK (
    price_min IS NULL OR price_max IS NULL OR price_max >= price_min
  ),
  CONSTRAINT job_proposals_message_valid CHECK (char_length(trim(message)) <= 1200)
);
CREATE UNIQUE INDEX IF NOT EXISTS job_proposals_job_trader_unique
  ON job_proposals(job_id, trader_id);
CREATE INDEX IF NOT EXISTS job_proposals_job_status_idx
  ON job_proposals(job_id, status, created_at);
CREATE INDEX IF NOT EXISTS job_proposals_trader_idx
  ON job_proposals(trader_id, created_at DESC);

CREATE TABLE IF NOT EXISTS trader_referral_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  visitor_key text NOT NULL,
  visited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referral_code, visitor_key)
);
CREATE INDEX IF NOT EXISTS trader_referral_visits_code_idx
  ON trader_referral_visits(referral_code, visited_at DESC);

CREATE TABLE IF NOT EXISTS trader_customer_notes (
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_key text NOT NULL,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trader_id, contact_key),
  CONSTRAINT trader_customer_notes_length CHECK (char_length(notes) <= 4000)
);

CREATE TABLE IF NOT EXISTS trader_reminder_rules (
  trader_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  quote_reminders_enabled boolean NOT NULL DEFAULT false,
  quote_after_days integer NOT NULL DEFAULT 3,
  invoice_due_reminders_enabled boolean NOT NULL DEFAULT false,
  invoice_due_before_days integer NOT NULL DEFAULT 0,
  invoice_overdue_reminders_enabled boolean NOT NULL DEFAULT false,
  invoice_overdue_after_days integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trader_reminder_quote_days CHECK (quote_after_days BETWEEN 2 AND 30),
  CONSTRAINT trader_reminder_due_days CHECK (invoice_due_before_days BETWEEN 0 AND 14),
  CONSTRAINT trader_reminder_overdue_days CHECK (invoice_overdue_after_days BETWEEN 1 AND 30)
);

ALTER TABLE job_site_visits
  ADD COLUMN IF NOT EXISTS proposed_slots timestamptz[] NOT NULL DEFAULT ARRAY[]::timestamptz[],
  ADD COLUMN IF NOT EXISTS selected_at timestamptz;

UPDATE job_site_visits
SET proposed_slots = ARRAY[proposed_at]::timestamptz[]
WHERE cardinality(proposed_slots) = 0;

CREATE INDEX IF NOT EXISTS job_site_visits_selected_idx
  ON job_site_visits(selected_at)
  WHERE selected_at IS NOT NULL;
