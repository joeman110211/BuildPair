import { createHash, randomBytes } from 'node:crypto';
import { getSql } from '@/lib/sql';
import { ensureLaunchWaitlistTable } from '@/lib/waitlist-store';

let readyPromise: Promise<void> | null = null;

export function hashEarlyAccessToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function createEarlyAccessToken() {
  return randomBytes(32).toString('base64url');
}

export function ensureEarlyAccessInviteTable() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    await ensureLaunchWaitlistTable();
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS early_access_invites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        waitlist_id uuid REFERENCES launch_waitlist(id) ON DELETE SET NULL,
        email text,
        phone text,
        audience text NOT NULL DEFAULT 'trader' CHECK (audience IN ('homeowner', 'trader')),
        delivery_channel text NOT NULL DEFAULT 'email' CHECK (delivery_channel IN ('email', 'sms', 'both')),
        token_hash text NOT NULL UNIQUE,
        granted_by text,
        granted_at timestamptz NOT NULL DEFAULT now(),
        email_sent_at timestamptz,
        sms_sent_at timestamptz,
        used_at timestamptz,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT early_access_invites_contact_required_check CHECK (
          nullif(trim(coalesce(email, '')), '') IS NOT NULL
          OR nullif(trim(coalesce(phone, '')), '') IS NOT NULL
        )
      )
    `;

    await sql`ALTER TABLE early_access_invites ALTER COLUMN email DROP NOT NULL`;
    await sql`ALTER TABLE early_access_invites ADD COLUMN IF NOT EXISTS phone text`;
    await sql`ALTER TABLE early_access_invites ADD COLUMN IF NOT EXISTS delivery_channel text NOT NULL DEFAULT 'email'`;
    await sql`ALTER TABLE early_access_invites ADD COLUMN IF NOT EXISTS sms_sent_at timestamptz`;
    await sql`ALTER TABLE early_access_invites DROP CONSTRAINT IF EXISTS early_access_invites_email_key`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS early_access_invites_email_unique_idx ON early_access_invites(lower(email)) WHERE email IS NOT NULL AND email <> ''`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS early_access_invites_phone_unique_idx ON early_access_invites(phone) WHERE phone IS NOT NULL AND phone <> ''`;
    await sql`CREATE INDEX IF NOT EXISTS early_access_invites_waitlist_idx ON early_access_invites(waitlist_id)`;
    await sql`CREATE INDEX IF NOT EXISTS early_access_invites_active_idx ON early_access_invites(email, revoked_at, used_at)`;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'early_access_invites_contact_required_check'
            AND conrelid = 'early_access_invites'::regclass
        ) THEN
          ALTER TABLE early_access_invites
            ADD CONSTRAINT early_access_invites_contact_required_check
            CHECK (
              nullif(trim(coalesce(email, '')), '') IS NOT NULL
              OR nullif(trim(coalesce(phone, '')), '') IS NOT NULL
            );
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'early_access_invites_delivery_channel_check'
            AND conrelid = 'early_access_invites'::regclass
        ) THEN
          ALTER TABLE early_access_invites
            ADD CONSTRAINT early_access_invites_delivery_channel_check
            CHECK (delivery_channel IN ('email', 'sms', 'both'));
        END IF;
      END
      $$
    `;
  })().catch((error) => {
    readyPromise = null;
    throw error;
  });
  return readyPromise;
}
