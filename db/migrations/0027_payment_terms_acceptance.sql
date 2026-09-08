ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS payment_terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_terms_version text;

COMMENT ON COLUMN jobs.payment_terms_accepted_at IS 'When the homeowner explicitly selected BuildPair staged payments for the accepted job.';
COMMENT ON COLUMN jobs.payment_terms_version IS 'Version of the BuildPair payment terms shown when staged payments were selected.';
