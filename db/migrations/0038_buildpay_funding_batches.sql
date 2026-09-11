-- BuildPay V4: one Stripe charge can fund more than one agreed project stage.
-- Example: £50 materials + £50 first work stage = one £100 homeowner payment.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS start_agreed_at timestamptz,
  ADD COLUMN IF NOT EXISTS start_proposed_by text REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS buildpay_funding_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE RESTRICT,
  customer_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  trader_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  total_amount integer NOT NULL CHECK (total_amount > 0),
  status text NOT NULL DEFAULT 'requires_payment' CHECK (status IN ('requires_payment','funded','partially_released','released','disputed','failed','refunded')),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  stripe_charge_id text,
  funded_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS buildpay_funding_batches_payment_intent_unique
  ON buildpay_funding_batches(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS buildpay_funding_batches_checkout_unique
  ON buildpay_funding_batches(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS buildpay_funding_batches_job_idx
  ON buildpay_funding_batches(job_id, created_at);

CREATE TABLE IF NOT EXISTS buildpay_funding_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES buildpay_funding_batches(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES job_milestones(id) ON DELETE RESTRICT,
  amount integer NOT NULL CHECK (amount > 0),
  platform_fee integer NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','funded','released','disputed','refunded')),
  stripe_transfer_id text,
  stripe_processing_fee_recovered integer NOT NULL DEFAULT 0 CHECK (stripe_processing_fee_recovered >= 0),
  trader_transfer_amount integer NOT NULL DEFAULT 0 CHECK (trader_transfer_amount >= 0),
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(milestone_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS buildpay_funding_allocations_transfer_unique
  ON buildpay_funding_allocations(stripe_transfer_id)
  WHERE stripe_transfer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS buildpay_funding_allocations_batch_idx
  ON buildpay_funding_allocations(batch_id, milestone_id);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS funding_batch_id uuid REFERENCES buildpay_funding_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_funding_batch_idx ON payments(funding_batch_id);

COMMENT ON TABLE buildpay_funding_batches IS 'One homeowner Stripe charge that can fund one or more contiguous BuildPay milestones.';
COMMENT ON TABLE buildpay_funding_allocations IS 'Contract-stage allocations within one BuildPay funding batch; transfers are released independently.';
COMMENT ON COLUMN buildpay_funding_batches.acknowledged_at IS 'When the tradesperson acknowledged the initial funding and accepted responsibility to procure quoted materials/start the job.';
COMMENT ON COLUMN jobs.start_agreed_at IS 'When the homeowner confirmed the tradesperson proposed start date/time.';
