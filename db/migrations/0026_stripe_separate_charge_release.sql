DO $$
BEGIN
  ALTER TYPE milestone_status ADD VALUE IF NOT EXISTS 'funded';
  ALTER TYPE milestone_status ADD VALUE IF NOT EXISTS 'disputed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'funded';
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'released';
  ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'disputed';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE trader_profiles
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE job_milestones
  ADD COLUMN IF NOT EXISTS funded_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_approved_by text REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_charge_id text,
  ADD COLUMN IF NOT EXISTS funded_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

CREATE INDEX IF NOT EXISTS payments_milestone_status_idx ON payments(milestone_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_transfer_id_unique_idx ON payments(stripe_transfer_id) WHERE stripe_transfer_id IS NOT NULL;

COMMENT ON COLUMN payments.funded_at IS 'When Stripe confirmed the homeowner charge. For controlled stages this precedes transfer to the tradesperson.';
COMMENT ON COLUMN payments.released_at IS 'When BuildPair instructed Stripe to transfer this payment to the connected tradesperson account.';
COMMENT ON COLUMN job_milestones.release_requested_at IS 'When the tradesperson marked the agreed trigger reached and requested homeowner release.';
COMMENT ON COLUMN job_milestones.disputed_at IS 'When release was paused because the homeowner raised an issue.';
