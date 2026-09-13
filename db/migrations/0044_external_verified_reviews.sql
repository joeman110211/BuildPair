-- Admin-verified customer reviews for genuine work completed outside BuildPair.
-- These are kept separate from BuildPair job-linked reviews so we never invent a
-- customer account, job, quote or payment record simply to display a verified review.

CREATE TABLE IF NOT EXISTS external_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  verified_by text REFERENCES users(id) ON DELETE SET NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS external_reviews_trader_created_idx
  ON external_reviews(trader_id, created_at DESC);
