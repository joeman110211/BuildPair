-- BuildPair administrator user-management support.
-- Keeps paid Stripe state separate from complimentary access so an admin grant does
-- not get accidentally removed by a later Stripe webhook, and so revoking a grant
-- can restore any genuine paid subscription that still exists.

ALTER TABLE trader_profiles
  ADD COLUMN IF NOT EXISTS paid_subscription_tier subscription_tier,
  ADD COLUMN IF NOT EXISTS complimentary_tier subscription_tier,
  ADD COLUMN IF NOT EXISTS complimentary_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS complimentary_granted_by text REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS complimentary_reason text NOT NULL DEFAULT '';

-- Existing paid profiles pre-date the separate paid/effective tier model.
UPDATE trader_profiles
SET paid_subscription_tier = subscription_tier
WHERE paid_subscription_tier IS NULL
  AND stripe_subscription_id IS NOT NULL
  AND subscription_tier <> 'free';

CREATE TABLE IF NOT EXISTS admin_user_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id text REFERENCES users(id) ON DELETE SET NULL,
  subject_user_id text,
  subject_email text,
  action_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_user_actions_subject_idx
  ON admin_user_actions(subject_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_user_actions_admin_idx
  ON admin_user_actions(admin_id, created_at DESC);
