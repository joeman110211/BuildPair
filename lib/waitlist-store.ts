import { getSql } from '@/lib/sql';

let readyPromise: Promise<void> | null = null;

export function ensureLaunchWaitlistTable() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS launch_waitlist (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text UNIQUE,
        phone text,
        postcode text NOT NULL,
        audience text NOT NULL CHECK (audience IN ('homeowner', 'trader')),
        trade text,
        tester_interest boolean NOT NULL DEFAULT false,
        sms_opt_in boolean NOT NULL DEFAULT false,
        marketing_opt_in boolean NOT NULL DEFAULT false,
        preferred_contact text NOT NULL DEFAULT 'email' CHECK (preferred_contact IN ('email', 'sms', 'both')),
        source text NOT NULL DEFAULT 'website',
        referral_code text,
        referred_by_id uuid REFERENCES launch_waitlist(id) ON DELETE SET NULL,
        status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'invited', 'registered', 'rewarded', 'removed')),
        launch_notified_at timestamptz,
        registered_user_id text REFERENCES users(id) ON DELETE SET NULL,
        registered_at timestamptz,
        pro_reward_granted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT launch_waitlist_contact_required_check CHECK (
          nullif(trim(coalesce(email, '')), '') IS NOT NULL
          OR nullif(trim(coalesce(phone, '')), '') IS NOT NULL
        )
      )
    `;

    // Keep older production databases compatible with the contact-choice waitlist.
    await sql`ALTER TABLE launch_waitlist ALTER COLUMN email DROP NOT NULL`;
    await sql`ALTER TABLE launch_waitlist ALTER COLUMN phone DROP NOT NULL`;
    await sql`ALTER TABLE launch_waitlist ADD COLUMN IF NOT EXISTS preferred_contact text NOT NULL DEFAULT 'email'`;
    await sql`ALTER TABLE launch_waitlist ADD COLUMN IF NOT EXISTS referral_code text`;
    await sql`ALTER TABLE launch_waitlist ADD COLUMN IF NOT EXISTS referred_by_id uuid REFERENCES launch_waitlist(id) ON DELETE SET NULL`;
    await sql`
      UPDATE launch_waitlist
      SET referral_code = 'BP' || upper(substr(replace(id::text, '-', ''), 1, 10))
      WHERE referral_code IS NULL OR trim(referral_code) = ''
    `;
    await sql`CREATE INDEX IF NOT EXISTS launch_waitlist_phone_idx ON launch_waitlist(phone) WHERE phone IS NOT NULL AND phone <> ''`;
    await sql`CREATE INDEX IF NOT EXISTS launch_waitlist_created_idx ON launch_waitlist(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS launch_waitlist_audience_idx ON launch_waitlist(audience, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS launch_waitlist_postcode_idx ON launch_waitlist(postcode)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS launch_waitlist_referral_code_uidx ON launch_waitlist(referral_code) WHERE referral_code IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS launch_waitlist_referred_by_idx ON launch_waitlist(referred_by_id) WHERE referred_by_id IS NOT NULL`;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'launch_waitlist_contact_required_check'
            AND conrelid = 'launch_waitlist'::regclass
        ) THEN
          ALTER TABLE launch_waitlist
            ADD CONSTRAINT launch_waitlist_contact_required_check
            CHECK (
              nullif(trim(coalesce(email, '')), '') IS NOT NULL
              OR nullif(trim(coalesce(phone, '')), '') IS NOT NULL
            );
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'launch_waitlist_preferred_contact_check'
            AND conrelid = 'launch_waitlist'::regclass
        ) THEN
          ALTER TABLE launch_waitlist
            ADD CONSTRAINT launch_waitlist_preferred_contact_check
            CHECK (preferred_contact IN ('email', 'sms', 'both'));
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
