-- Stores only the Google Place ID selected for a trader.
-- Google review/rating content is fetched live from Google Maps Platform and is not
-- persisted here, keeping the integration isolated from BuildPair's native reviews.

CREATE TABLE IF NOT EXISTS google_review_connections (
  trader_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  place_id text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS google_review_connections_place_idx
  ON google_review_connections(place_id);
