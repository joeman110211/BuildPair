CREATE TABLE IF NOT EXISTS job_private_details (
  job_id uuid PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address_line1 text NOT NULL,
  address_line2 text,
  town_city text NOT NULL,
  access_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_private_details_customer_idx ON job_private_details(customer_id);

ALTER TABLE job_milestones
  ADD COLUMN IF NOT EXISTS dispute_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS dispute_response text,
  ADD COLUMN IF NOT EXISTS dispute_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_resolved_by text REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dispute_resolution_note text;

ALTER TABLE job_milestones DROP CONSTRAINT IF EXISTS job_milestones_dispute_status_check;
ALTER TABLE job_milestones ADD CONSTRAINT job_milestones_dispute_status_check
  CHECK (dispute_status IN ('none', 'open', 'trader_response', 'escalated', 'resolved'));

CREATE TABLE IF NOT EXISTS external_payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES job_milestones(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  trader_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount integer NOT NULL,
  payer_confirmed_at timestamptz,
  recipient_confirmed_at timestamptz,
  payer_note text NOT NULL DEFAULT '',
  recipient_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT external_payment_amount_positive CHECK (amount > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS external_payment_records_milestone_unique ON external_payment_records(milestone_id);
CREATE INDEX IF NOT EXISTS external_payment_records_job_idx ON external_payment_records(job_id);

COMMENT ON TABLE job_private_details IS 'Private job address/access information. Never expose in marketplace listing responses. It may be shared with a tradesperson only after the homeowner confirms a site visit or awards that tradesperson the job.';
COMMENT ON TABLE external_payment_records IS 'User-declared records of payments arranged outside BuildPair. These records do not mean BuildPair processed, protected, verified or guaranteed the payment.';
COMMENT ON COLUMN job_milestones.dispute_status IS 'BuildPay pre-release issue workflow state. Escalated means the issue needs BuildPair admin attention; it is not a legal adjudication.';
