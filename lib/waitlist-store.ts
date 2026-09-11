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
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS launch_waitlist_created_idx ON launch_waitlist(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS launch_waitlist_audience_idx ON launch_waitlist(audience, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS launch_waitlist_postcode_idx ON launch_waitlist(postcode)`;
  })().catch((error) => {
    readyPromise = null;
    throw error;
  });
  return readyPromise;
}
