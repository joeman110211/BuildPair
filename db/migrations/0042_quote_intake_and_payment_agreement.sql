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

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_external_payment_requires_both_parties;
ALTER TABLE jobs ADD CONSTRAINT jobs_external_payment_requires_both_parties
  CHECK (
    payment_mode <> 'external'
    OR (external_payment_customer_agreed_at IS NOT NULL AND external_payment_trader_agreed_at IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION require_completed_confirmed_site_visit_before_quote()
RETURNS trigger
LANGUAGE plpgsql
AS 'BEGIN
  IF EXISTS (
    SELECT 1
    FROM job_site_visits v
    WHERE v.job_id = NEW.job_id
      AND v.trader_id = NEW.trader_id
      AND v.status = ''confirmed''
  ) THEN
    RAISE EXCEPTION ''Mark the confirmed site visit completed in BuildPair before sending the post-visit quote.'';
  END IF;
  RETURN NEW;
END;';

DROP TRIGGER IF EXISTS quotes_require_completed_site_visit ON quotes;
CREATE TRIGGER quotes_require_completed_site_visit
BEFORE INSERT OR UPDATE OF total_amount, scope, payment_schedule ON quotes
FOR EACH ROW
EXECUTE FUNCTION require_completed_confirmed_site_visit_before_quote();
