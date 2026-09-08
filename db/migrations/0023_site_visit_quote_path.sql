CREATE TABLE IF NOT EXISTS job_site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trader_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposed_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'declined', 'completed', 'cancelled')),
  note text NOT NULL DEFAULT '',
  responded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_site_visits_job_idx ON job_site_visits(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_site_visits_trader_idx ON job_site_visits(trader_id, proposed_at DESC);
CREATE INDEX IF NOT EXISTS job_site_visits_customer_idx ON job_site_visits(customer_id, proposed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS job_site_visits_one_active_pair
  ON job_site_visits(job_id, trader_id)
  WHERE status IN ('proposed', 'confirmed');
