CREATE TABLE IF NOT EXISTS launch_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  postcode text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('homeowner', 'trader')),
  trade text,
  tester_interest boolean NOT NULL DEFAULT false,
  sms_opt_in boolean NOT NULL DEFAULT false,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'website',
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'registered', 'rewarded', 'removed')),
  launch_notified_at timestamptz,
  registered_user_id text REFERENCES users(id) ON DELETE SET NULL,
  registered_at timestamptz,
  pro_reward_granted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS launch_waitlist_created_idx ON launch_waitlist(created_at);
CREATE INDEX IF NOT EXISTS launch_waitlist_audience_idx ON launch_waitlist(audience, created_at);
CREATE INDEX IF NOT EXISTS launch_waitlist_postcode_idx ON launch_waitlist(postcode);

COMMENT ON TABLE launch_waitlist IS 'BuildPair pre-launch waiting list. Launch notification is part of the requested service; separate marketing consent is stored independently.';
