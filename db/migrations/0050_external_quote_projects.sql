ALTER TABLE business_quotes
  ADD COLUMN IF NOT EXISTS trade_category text,
  ADD COLUMN IF NOT EXISTS revision_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS supersedes_quote_id uuid REFERENCES business_quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS managed_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_note text;

CREATE INDEX IF NOT EXISTS business_quotes_managed_job_idx ON business_quotes(managed_job_id);
CREATE INDEX IF NOT EXISTS business_quotes_supersedes_idx ON business_quotes(supersedes_quote_id);

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'marketplace',
  ADD COLUMN IF NOT EXISTS external_source_quote_id uuid REFERENCES business_quotes(id) ON DELETE SET NULL;

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_source_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_source_check
  CHECK (source IN ('marketplace', 'direct', 'external_quote'));

CREATE INDEX IF NOT EXISTS jobs_external_source_quote_idx ON jobs(external_source_quote_id);
