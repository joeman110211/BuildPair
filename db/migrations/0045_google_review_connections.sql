-- Google Place IDs may be stored long-term. Review/place content stays live from Google.
-- The verification result is BuildPair metadata, not cached Google content.

CREATE TABLE IF NOT EXISTS google_review_connections (
  trader_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending_review',
  match_score integer NOT NULL DEFAULT 0,
  match_reasons text[] NOT NULL DEFAULT ARRAY[]::text[],
  reviewed_by text REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE google_review_connections ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending_review';
ALTER TABLE google_review_connections ADD COLUMN IF NOT EXISTS match_score integer NOT NULL DEFAULT 0;
ALTER TABLE google_review_connections ADD COLUMN IF NOT EXISTS match_reasons text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE google_review_connections ADD COLUMN IF NOT EXISTS reviewed_by text REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE google_review_connections ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'google_review_connections_status_check'
  ) THEN
    ALTER TABLE google_review_connections
      ADD CONSTRAINT google_review_connections_status_check
      CHECK (verification_status IN ('verified', 'pending_review', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS google_review_connections_place_idx ON google_review_connections(place_id);
CREATE INDEX IF NOT EXISTS google_review_connections_review_queue_idx ON google_review_connections(verification_status, updated_at DESC);
