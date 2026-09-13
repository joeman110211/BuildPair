ALTER TABLE launch_waitlist
  ADD COLUMN IF NOT EXISTS referral_code text;

ALTER TABLE launch_waitlist
  ADD COLUMN IF NOT EXISTS referred_by_id uuid REFERENCES launch_waitlist(id) ON DELETE SET NULL;

UPDATE launch_waitlist
SET referral_code = 'BP' || upper(substr(replace(id::text, '-', ''), 1, 10))
WHERE referral_code IS NULL OR trim(referral_code) = '';

CREATE UNIQUE INDEX IF NOT EXISTS launch_waitlist_referral_code_uidx
  ON launch_waitlist(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS launch_waitlist_referred_by_idx
  ON launch_waitlist(referred_by_id)
  WHERE referred_by_id IS NOT NULL;

COMMENT ON COLUMN launch_waitlist.referral_code IS 'Shareable referral code assigned to this waitlist entry.';
COMMENT ON COLUMN launch_waitlist.referred_by_id IS 'Waitlist entry whose referral link led to this signup.';
