ALTER TABLE users
  ADD COLUMN IF NOT EXISTS project_plus_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS project_plus_stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS project_plus_stripe_customer_id text;

CREATE TABLE IF NOT EXISTS project_plus_usage (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_month date NOT NULL,
  image_generations integer NOT NULL DEFAULT 0,
  planner_requests integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_month),
  CONSTRAINT project_plus_usage_non_negative CHECK (image_generations >= 0 AND planner_requests >= 0)
);

CREATE TABLE IF NOT EXISTS project_plus_designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_type text NOT NULL,
  title text NOT NULL,
  prompt text NOT NULL,
  image_url text,
  plan_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_plus_designs_user_idx ON project_plus_designs(user_id, created_at DESC);
