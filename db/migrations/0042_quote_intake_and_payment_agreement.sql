ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS quote_intake_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_payment_proposed_by text REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_payment_proposed_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_payment_customer_agreed_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_payment_trader_agreed_at timestamptz;

CREATE INDEX IF NOT EXISTS jobs_quote_intake_open_idx
  ON jobs(status, created_at DESC)
  WHERE quote_intake_closed_at IS NULL AND accepted_quote_id IS NULL;

-- Existing direct-payment projects predate two-party arrangement confirmation.
-- Preserve them as agreed legacy projects so the new UI does not put them back
-- into a pending state.
UPDATE jobs j
SET external_payment_customer_agreed_at = COALESCE(j.external_payment_customer_agreed_at, j.updated_at, now()),
    external_payment_trader_agreed_at = COALESCE(j.external_payment_trader_agreed_at, j.updated_at, now()),
    external_payment_proposed_at = COALESCE(j.external_payment_proposed_at, j.updated_at, now())
WHERE j.payment_mode = 'external';
