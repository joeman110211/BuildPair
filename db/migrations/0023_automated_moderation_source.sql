-- Distinguish BuildPair automated safety reports from user-submitted reports.
-- Automated reports do not have a human reporter and must not make the offending
-- account appear to have reported itself in the admin moderation queue.

ALTER TABLE moderation_reports
  ALTER COLUMN reporter_id DROP NOT NULL;

ALTER TABLE moderation_reports
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user';

ALTER TABLE moderation_reports DROP CONSTRAINT IF EXISTS moderation_reports_source_valid;
ALTER TABLE moderation_reports
  ADD CONSTRAINT moderation_reports_source_valid
  CHECK (source IN ('user', 'automated'));

ALTER TABLE moderation_reports DROP CONSTRAINT IF EXISTS moderation_reports_reporter_source_valid;
ALTER TABLE moderation_reports
  ADD CONSTRAINT moderation_reports_reporter_source_valid
  CHECK (
    (source = 'user' AND reporter_id IS NOT NULL)
    OR
    (source = 'automated' AND reporter_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS moderation_reports_source_idx
  ON moderation_reports(source, status, created_at DESC);
