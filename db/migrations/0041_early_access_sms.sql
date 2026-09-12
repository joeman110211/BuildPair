ALTER TABLE early_access_invites
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE early_access_invites
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS delivery_channel text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS sms_sent_at timestamptz;

ALTER TABLE early_access_invites
  DROP CONSTRAINT IF EXISTS early_access_invites_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS early_access_invites_email_unique_idx
  ON early_access_invites(lower(email))
  WHERE email IS NOT NULL AND email <> '';

CREATE UNIQUE INDEX IF NOT EXISTS early_access_invites_phone_unique_idx
  ON early_access_invites(phone)
  WHERE phone IS NOT NULL AND phone <> '';

ALTER TABLE early_access_invites
  DROP CONSTRAINT IF EXISTS early_access_invites_contact_required_check;
ALTER TABLE early_access_invites
  ADD CONSTRAINT early_access_invites_contact_required_check
  CHECK (
    nullif(trim(coalesce(email, '')), '') IS NOT NULL
    OR nullif(trim(coalesce(phone, '')), '') IS NOT NULL
  );

ALTER TABLE early_access_invites
  DROP CONSTRAINT IF EXISTS early_access_invites_delivery_channel_check;
ALTER TABLE early_access_invites
  ADD CONSTRAINT early_access_invites_delivery_channel_check
  CHECK (delivery_channel IN ('email', 'sms', 'both'));
