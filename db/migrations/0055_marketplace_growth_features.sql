-- Growth and workflow upgrades: referral measurement, quick proposals, reminder rules,
-- lightweight customer follow-up notes, and multi-slot site-visit scheduling.

CREATE TABLE IF NOT EXISTS trader_referral_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_waitlist_id uuid NOT NULL REFERENCES launch_waitlist(id) ON DELETE CASCADE,
  visitor_key text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  visit_count integer NOT NULL DEFAULT 1,
  CONSTRAINT trader_referral_visits_key_check CHECK (char_length(visitor_key) BETWEEN 8 AND 120),
  UNIQUE(referrer_waitlist_id, visitor_key)
);
CREATE INDEX IF NOT EXISTS trader_referral_visits_referrer_idx ON trader_referral_visits(referrer_waitlist_id, first_seen_at DESC);

CREATE TABLE IF NOT EXISTS job_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  estimate_min integer NOT NULL DEFAULT 0,
  estimate_max integer NOT NULL DEFAULT 0,
  available_from date,
  note text NOT NULL DEFAULT '',
  portfolio_urls text[] NOT NULL DEFAULT ARRAY[]::text[],
  site_visit_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  shortlisted_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_proposals_estimate_check CHECK (estimate_min >= 0 AND estimate_max >= estimate_min),
  CONSTRAINT job_proposals_note_check CHECK (char_length(note) <= 1200),
  CONSTRAINT job_proposals_portfolio_count_check CHECK (cardinality(portfolio_urls) <= 3),
  CONSTRAINT job_proposals_status_check CHECK (status IN ('pending','shortlisted','declined','withdrawn','converted')),
  UNIQUE(job_id, trader_id)
);
CREATE INDEX IF NOT EXISTS job_proposals_job_status_idx ON job_proposals(job_id, status, created_at);
CREATE INDEX IF NOT EXISTS job_proposals_trader_idx ON job_proposals(trader_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS trader_reminder_preferences (
  trader_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  quote_enabled boolean NOT NULL DEFAULT false,
  quote_after_days integer NOT NULL DEFAULT 3,
  invoice_due_enabled boolean NOT NULL DEFAULT false,
  invoice_overdue_enabled boolean NOT NULL DEFAULT false,
  overdue_after_days integer NOT NULL DEFAULT 3,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trader_reminder_quote_days_check CHECK (quote_after_days BETWEEN 2 AND 30),
  CONSTRAINT trader_reminder_overdue_days_check CHECK (overdue_after_days BETWEEN 1 AND 30)
);

CREATE TABLE IF NOT EXISTS trader_customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_key text NOT NULL,
  note text NOT NULL,
  follow_up_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trader_customer_notes_key_check CHECK (char_length(contact_key) BETWEEN 1 AND 320),
  CONSTRAINT trader_customer_notes_note_check CHECK (char_length(trim(note)) BETWEEN 1 AND 2000)
);
CREATE INDEX IF NOT EXISTS trader_customer_notes_contact_idx ON trader_customer_notes(trader_id, contact_key, created_at DESC);
CREATE INDEX IF NOT EXISTS trader_customer_notes_follow_up_idx ON trader_customer_notes(trader_id, follow_up_at) WHERE completed_at IS NULL;

CREATE TABLE IF NOT EXISTS job_site_visit_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES job_site_visits(id) ON DELETE CASCADE,
  proposed_at timestamptz NOT NULL,
  selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(visit_id, proposed_at)
);
CREATE INDEX IF NOT EXISTS job_site_visit_options_visit_idx ON job_site_visit_options(visit_id, proposed_at);
