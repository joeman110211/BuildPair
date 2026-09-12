ALTER TABLE launch_waitlist
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE launch_waitlist
  ADD COLUMN IF NOT EXISTS preferred_contact text NOT NULL DEFAULT 'email';

ALTER TABLE launch_waitlist
  DROP CONSTRAINT IF EXISTS launch_waitlist_contact_required_check;

ALTER TABLE launch_waitlist
  ADD CONSTRAINT launch_waitlist_contact_required_check
  CHECK (
    nullif(trim(coalesce(email, '')), '') IS NOT NULL
    OR nullif(trim(coalesce(phone, '')), '') IS NOT NULL
  );

ALTER TABLE launch_waitlist
  DROP CONSTRAINT IF EXISTS launch_waitlist_preferred_contact_check;

ALTER TABLE launch_waitlist
  ADD CONSTRAINT launch_waitlist_preferred_contact_check
  CHECK (preferred_contact IN ('email', 'sms', 'both'));

CREATE INDEX IF NOT EXISTS launch_waitlist_phone_idx
  ON launch_waitlist(phone)
  WHERE phone IS NOT NULL AND phone <> '';

COMMENT ON COLUMN launch_waitlist.preferred_contact IS
  'Requested launch-list contact method. SMS/both represents explicit service-message consent, not marketing consent.';
