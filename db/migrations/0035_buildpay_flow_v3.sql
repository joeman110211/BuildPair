-- BuildPay v3: grouped initial funding, private site details and structured disputes.

-- A single Stripe charge can now fund more than one milestone (for example
-- materials + the first labour stage). Keep one ledger row per milestone.
-- The original SQL migration declared stripe_payment_intent_id UNIQUE inline,
-- which PostgreSQL names payments_stripe_payment_intent_id_key. Some newer
-- databases may also have the Drizzle-named index, so remove both safely.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_stripe_payment_intent_id_key;
DROP INDEX IF EXISTS payments_intent_unique;
CREATE UNIQUE INDEX IF NOT EXISTS payments_intent_milestone_unique
  ON payments(stripe_payment_intent_id, milestone_id);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS site_address_line1 text,
  ADD COLUMN IF NOT EXISTS site_address_line2 text,
  ADD COLUMN IF NOT EXISTS site_town_city text,
  ADD COLUMN IF NOT EXISTS site_county text,
  ADD COLUMN IF NOT EXISTS site_postcode text,
  ADD COLUMN IF NOT EXISTS site_phone text,
  ADD COLUMN IF NOT EXISTS site_details_confirmed_at timestamptz;

DO $$
BEGIN
  CREATE TYPE payment_dispute_status AS ENUM ('open', 'responded', 'escalated', 'resolved_release');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payment_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  milestone_id uuid NOT NULL REFERENCES job_milestones(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  trader_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status payment_dispute_status NOT NULL DEFAULT 'open',
  reason text NOT NULL,
  trader_response text,
  escalation_note text,
  admin_note text,
  reviewed_by text REFERENCES users(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  escalated_at timestamptz,
  reviewed_at timestamptz,
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS payment_disputes_job_idx ON payment_disputes(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_disputes_milestone_idx ON payment_disputes(milestone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_disputes_status_idx ON payment_disputes(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payment_disputes_one_active_per_milestone
  ON payment_disputes(milestone_id)
  WHERE status IN ('open', 'responded', 'escalated');

COMMENT ON COLUMN jobs.site_address_line1 IS 'Private worksite address shared only with the awarded tradesperson after quote acceptance.';
COMMENT ON COLUMN jobs.site_phone IS 'Private homeowner contact number for the awarded BuildPair job.';
COMMENT ON TABLE payment_disputes IS 'BuildPair stage-release issues. Opening a dispute pauses transfer; resolution never moves money without a subsequent homeowner release approval.';
COMMENT ON COLUMN payment_disputes.admin_note IS 'Administrator review note for escalated payment disputes. This is not public marketplace copy.';
